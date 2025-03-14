using ClientDependency.Core.Controls;
using DelftDI.Common.RIS.Common;
using DelftDI.Common.RIS.Json;
using DelftDI.ZillionRis.Licensing;
using DelftDI.ZillionRis.Logging;
using RazorEngine.Templating;
using Rogan.ZillionRis.Configuration;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.Security;
using Rogan.ZillionRis.Session;
using Rogan.ZillionRis.WebControls.Common;
using Rogan.ZillionRis.WebControls.Pages;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Linq.Expressions;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Web;
using System.Web.UI;
using Rogan.ZillionRis.Web.Handlers.Razor;
using ZillionRis.Security;

namespace ZillionRis.Controls
{
    /// <summary>
    /// 	Summary description for PageBase
    /// </summary>
    public abstract class PageBase : PageBaseBase
    {
        #region Fields
        private ClientDependencyLoader _clientDependencyLoader;
        #endregion

        #region Properties
        public virtual bool AllowCachedResponse
        {
            get { return false; }
        }

        public int CurrentUserID
        {
            get { return SessionContext.User.UserID; }
        }

        /// <summary>
        /// 	Gets the global popup message interface.
        /// </summary>
        /// <value>The global popup message interface.</value>
        protected virtual IPageGlobalMessagePopup GlobalPopup
        {
            get { return Master as IPageGlobalMessagePopup; }
        }

        /// <summary>
        /// 	Gets the page permission key which gets validated before the page gets initialized using <see
        ///  	cref = "SecurityHelper.ValidatePageAccess" />.
        /// </summary>
        /// <value>The page permission key (when the value is <c>null</c> it is assumed that no permission is required).</value>
        protected abstract string PagePermissionKey { get; }

        /// <summary>
        /// 	Gets the page access key.
        /// </summary>
        /// <remarks>
        /// 	<para>Created by tdgroen at 2011-11-08.</para>
        /// </remarks>
        public virtual string RisAccessKey
        {
            get { return null; }
        }

        /// <summary>
        ///     Gets the user manual entry point
        /// </summary>
        public virtual string PageManualAccessKey
        {
            get { return "Home.html"; }
        }

        /// <summary>
        /// 	Gets the master page that determines the overall look of the page.
        /// </summary>
        /// <value></value>
        /// <returns>The <see cref = "T:System.Web.UI.MasterPage" /> associated with this page if it exists; otherwise, null. </returns>
        public new IMasterPage Master
        {
            get { return base.Master as IMasterPage; }
        }

        /// <summary>
        /// 	Gets the master page.
        /// </summary>
        /// <value>The master page.</value>
        public MasterPage MasterPage
        {
            get { return base.Master; }
        }

        /// <summary>
        ///     Indicates whether page plugin (scripts) should be included on the page.
        /// </summary>
        protected virtual bool IncludesPagePlugin
        {
            get { return true; }
        }
        #endregion

        #region ASP.NET Overrides
        /// <summary>
        /// 	Creates the HTML text writer (with no tabs and new lines in release mode).
        /// </summary>
        /// <param name = "writer">The writer.</param>
        /// <returns></returns>
        /// <remarks>
        /// 	<para>Created by tdgroen on 2011-01-28.</para>
        /// </remarks>
        protected override HtmlTextWriter CreateHtmlTextWriter(TextWriter writer)
        {
#if DEBUG
            return base.CreateHtmlTextWriter(writer);
#else
            return new CompactHtmlWriter(writer);
#endif
        }

        public sealed class CompactHtmlWriter : HtmlTextWriter
        {
            public CompactHtmlWriter(TextWriter writer)
                : base(writer, string.Empty)
            {
                this.NewLine = string.Empty;
            }

            protected override void OutputTabs()
            {
                this.Indent = 0;
                base.OutputTabs();
            }
        }

        /// <summary>
        /// 	Sets the <see cref = "P:System.Web.UI.Page.Culture" /> and <see cref = "P:System.Web.UI.Page.UICulture" /> for the current thread of the page.
        /// </summary>
        protected override void InitializeCulture()
        {
            string language = null;
            try
            {
                language = this.Application.Language;
                if (language != null)
                {
                    this.UICulture = language;
                    Thread.CurrentThread.CurrentUICulture = CultureInfo.GetCultureInfo(language);

                    try
                    {
                        this.Culture = language;
                        Thread.CurrentThread.CurrentCulture = CultureInfo.CreateSpecificCulture(language);
                    }
                    catch (Exception ex)
                    {
                        // May fail when the language identifier is not specific enough (culture used for parsing and formatting values).
                        // e.g.: 'nl' fails while 'nl-NL' succeeds.
                        this.Application.LogAction(ZillionRisLogLevel.Warning,
                                                   string.Format("Failed to initialize the user's culture: {0}; {1} -- {2}", language ?? "null", ex.Message, ex.InnerException));
                    }
                }
            }
            catch (Exception ex)
            {
                // Initializing the culture has failed (probably the culture identifier is invalid).
                // Since the error is not critical just leave the current set culture.
                this.Application.LogAction(ZillionRisLogLevel.Warning,
                                           string.Format("Failed to initialize the user's UI culture: {0}; {1} -- {2}", language ?? "null", ex.Message, ex.InnerException));
                return;
            }
        }

        /// <summary>
        /// 	Raises the <see cref = "E:System.Web.UI.Page.PreInit" /> event at the beginning of page initialization.
        /// </summary>
        /// <param name = "e">An <see cref = "T:System.EventArgs" /> that contains the event data.</param>
        protected override void OnPreInit(EventArgs e)
        {
            if (this.IsPostBack == false && this.AllowCachedResponse)
            {
                // Responses with 304 not modified, when the client sends a valid ETag that is stored in the session.
                // Resulting in short responses for logged in users.
                if (this.RespondWithCache())
                    return;
            }

            if (this.IsPostBack)
            {
                // Prevents the page from being added to the history stack of the browser.
                this.PreventCache();
            }

            if (this.PagePermissionKey != null)
            {
                // Check if user is allowed to view this page.
                SecurityHelper.ValidatePageAccess(this.PagePermissionKey);
            }

            this.InitializeMasterPage();

            base.OnPreInit(e);
        }

        private bool RespondWithCache()
        {
            var currentSessionID = this.Application.ETagCacheID;
            var previousSessionID = this.Request.Headers["If-None-Match"];

            this.Response.Headers["ETag"] = currentSessionID;

            if (currentSessionID == previousSessionID)
            {
                this.Response.StatusCode = 304;
                this.Response.End();
                return true;
            }
            return false;
        }

        protected void PreventCache()
        {
            this.Response.CacheControl = "no-cache";
            this.Response.AddHeader("Pragma", "no-cache");
            this.Response.Expires = -1;
        }

        protected override void OnInit(EventArgs e)
        {
            base.OnInit(e);

            if (this.IsPostBack == false)
            {
                if (IncludesPagePlugin)
                    this.IncludePagePlugin();
                this.SessionContext.OriginPage = this.RisAccessKey;
            }

            this.RegisterUserInfoJavaScript();
            this.RegisterPageKeyScript();
            this.RegisterRelativePathsScript();
        }

        private void RegisterPageKeyScript()
        {
            var pageAccessKey = this.RisAccessKey;
            var pageManualAccessKey = this.PageManualAccessKey;

            this.InitWindowVariables(new { pageAccessKey = pageAccessKey});
            this.InitWindowVariables(new { pageManualAccessKey = pageManualAccessKey });
        }
        #endregion

        #region Private/Protected Methods
        /// <summary>
        /// 	Navigates to the previous URL.
        /// </summary>
        /// <remarks>
        /// 	<para>Created by tdgroen on 2010-08-18.</para>
        /// </remarks>
        protected void NavigateToPreviousUrl()
        {
            this.AppendPageScript("ZillionRis.GoBackToPreviousPage();");
        }

        protected virtual void InitializeMasterPage()
        {
            this.MasterPageFile = "~/LowProfileMaster.master";
        }
        #endregion

        protected void LoadPatientBanner(int patientID)
        {
            this.AppendPageScript(string.Format("$('#PatientBanner').load(ZillionRis.PageUrl('Parts/PatientBanner.cshtml?id={0}'));", patientID));
        }

        protected string RenderPart(string path)
        {
            try
            {
                return RazorCompilerFromFile.Instance.ExecuteTemplateFromFile(Server.MapPath(path), Application, null);
            }
            catch (TemplateCompilationException ex)
            {
                this.Application.LogAction(ZillionRisLogLevel.Error, ex.ToString() + ex.Errors.Select(item => item.ToString()).JoinText("\r\n"));
                return  "<pre style=\"color: red\"> Rendering part failed, see logs for details </pre>";
            }
            catch (Exception ex)
            {
                this.Application.LogAction(ZillionRisLogLevel.Error, ex.ToString());
                return "<pre style=\"color: red\"> Rendering part failed, see logs for details </pre>";
            }
        }

        /// <summary>
        /// Registers a JavaScript function named doPagePostBack(arg) that does a post back to the current page with the specified arguments.
        /// </summary>
        /// <remarks>
        /// 	<para>Created by tdgroen at 2012-03-07.</para>
        /// </remarks>
        protected void RegisterPagePostBackScript()
        {
            this.ClientScript.RegisterClientScriptBlock(typeof(PageBase), "PagePostBack", "function doPagePostBack(arg) { __doPostBack('" + HttpUtility.JavaScriptStringEncode(this.UniqueID) + "', arg); }", true);
        }

        /// <summary>
        /// Registers a JavaScript block that overrides the functions ZillionRis.ApiUrl(url) and ZillionRis.PageUrl(url).
        /// The values that are returned will have a relative path prefixed that can be used by the browser when the requested page URL is not in the root of the website.
        /// </summary>
        /// <remarks>
        /// 	<para>Created by tdgroen at 2012-03-07.</para>
        /// </remarks>
        protected void RegisterRelativePathsScript()
        {
            const string script = @"window.ZillionRis.AbsoluteUrl=function(url){{return{2}+url}};window.ZillionRis.ApiUrl=function(url){{return{0}+url}};window.ZillionRis.PageUrl=function(url){{return{1}+url}};";

            var format = String.Format(script,
                this.ResolveClientUrl("~/api/").ToJsStringLiteral(),
                this.ResolveClientUrl("~/").ToJsStringLiteral(),
                new Uri(this.Request.Url, this.ResolveClientUrl("~/")).ToString().ToJsStringLiteral());

            this.ClientScript.RegisterClientScriptBlock(typeof(PageBase), "ZillionRisUrls", format, true);
        }

        protected void RegisterUserInfoJavaScript()
        {
            var sessionContext = this.SessionContext;
            var licenseManager = IocContainer.Instance.Require<IRisLicenseManager>();

            this.InitWindowVariables(new
            {
                currentUserID = sessionContext.User.UserID,
                currentUserName = sessionContext.User.DisplayName,
                currentLocationID = sessionContext.GetActiveLocationID(),
                licensedProductName = licenseManager.LicensedProductName,
                permissions = new
                {
                    hasOrderBookingPermission = SessionContext.HasPermission(UserPermissions.PageOrderBooking),
                    hasReceptionPermission = SessionContext.HasPermission(UserPermissions.PageReception),
                    hasTranscriptionPermission = SessionContext.HasPermission(UserPermissions.PageTranscription),
                    hasAuthorizationPermission = SessionContext.HasPermission(UserPermissions.PageAuthorization),
                    hasImagingPermission = SessionContext.HasPermission(UserPermissions.PageImaging),
                    hasOrderApprovalPermission = SessionContext.HasPermission(UserPermissions.PageOrderApproval),
                    hasDictationWorklistPermission = SessionContext.HasPermission(UserPermissions.PageDictationWorklist),
                    hasSystemMenuPrintersPermission = SessionContext.HasPermission(UserPermissions.SystemMenuPrinters),
                    hasEditOrderPermission = SessionContext.HasPermission(UserPermissions.EditOrder),
                    hasDiscussionListPermission = SessionContext.HasPermission(UserPermissions.PageDiscussion),
                    hasFailsafePermission = SessionContext.HasPermission(UserPermissions.PageFailsafe),
                    hasPagePatientDetailsPermission = SessionContext.HasPermission(UserPermissions.PagePatientDetails),
                    hasPatientContactInfoPermission = SessionContext.HasPermission(UserPermissions.PatientContactInformation),
                    hasSendToHousekeepingPermission = SessionContext.HasPermission(UserPermissions.SendToHousekeeping),
                    hasLastAccessedExaminationsPermission = SessionContext.HasPermission(UserPermissions.LastAccessedExaminations),
                    hasAddPatientPermission = RisAppSettings.RISControlsPatientData && SessionContext.HasPermission(UserPermissions.AddPatient),
                    hasCancelOrderPermission = SessionContext.HasPermissionAny(UserPermissions.CancelOrder, UserPermissions.SuperUser),
                    hasAssignProtocolPermission = SessionContext.HasPermission(UserPermissions.AssignProtocol),
                }
            });
        }

    }

    public interface IPageModel<TModel>
        where TModel : class
    {
        TModel Model { get; set; }
    }

    public abstract class PageModelBase<TModel> : PageBase, IPageModel<TModel>
        where TModel : class
    {
        private static readonly PropertyDescriptorCollection s_properties = TypeDescriptor.GetProperties(typeof(TModel));
        public TModel Model { get; set; }

        private TModel ReadForm()
        {
            var form = this.Request.Form;
            var ts = s_properties;
            var ins = this.CreateModel();
            foreach (PropertyDescriptor t in ts)
            {
                var v = form[t.Name];
                if (v != null)
                {
                    try
                    {
                        var type = Nullable.GetUnderlyingType(t.PropertyType) ?? t.PropertyType;
                        if (type == typeof (bool))
                        {
                            t.SetValue(ins, !string.IsNullOrWhiteSpace(v) && v != "false");
                        }
                        else if (t.PropertyType.IsGenericType && t.PropertyType.GetGenericTypeDefinition()== typeof(Nullable<>) && string.IsNullOrEmpty(v))
                        {
                            t.SetValue(ins, Activator.CreateInstance(t.PropertyType));
                        }
                        else if (type.IsValueType && string.IsNullOrEmpty(v))
                        {
                            t.SetValue(ins, Activator.CreateInstance(type));
                        }
                        else if (type == typeof(DateTimeOffset))
                        {
                            t.SetValue(ins, DateTimeOffset.Parse(v));
                        }
                        else
                        {
                            t.SetValue(ins, Convert.ChangeType(v, type));
                        }
                    }
                    catch (Exception ex)
                    {
                        throw new Exception(string.Format("Unable to read value [{0}]. + {1}", t.Name, ex.Message), ex);
                    }
                }
            }
            return ins;
        }

        protected virtual TModel CreateModel()
        {
            return Activator.CreateInstance<TModel>();
        }
        protected virtual void OnModelRead()
        {
            
        }

        protected override void OnInit(EventArgs e)
        {
            this.Model = this.ReadForm();
            this.OnModelRead();

            base.OnInit(e);
        }

    }

    public static class DictionaryExtensions
    {
        public static string ToHtmlAttributes(this IDictionary<string, string> d)
        {
            return d.Select(x => x.Key + "=\"" + HttpUtility.HtmlAttributeEncode(x.Value) + "\"").JoinText(" ");
        }
    }

    public sealed class HtmlAttributes : Dictionary<string, string>
    {
        public void ApplyObject(object value)
        {
            if (value != null)
            {
                var properties = value.GetType().GetProperties();
                foreach (PropertyInfo propertyInfo in properties)
                    this[PreProcessKey(propertyInfo.Name)] = Convert.ToString(propertyInfo.GetValue(value, null));
            }
        }

        public void ApplyDataBind(string binding)
        {
            var current = this["data-bind"];

            if (string.IsNullOrEmpty(current))
                current = binding;
            else
                current += ", " + binding;

            this["data-bind"] = current;
        }

        static string PreProcessKey(string key)
        {
            key = Regex.Replace(key, "([a-z])([A-Z])", OnEvaluator);
            return key.ToLower();
        }

        private static string OnEvaluator(Match match)
        {
            return String.Format("{0}-{1}", match.Groups[1].Value, match.Groups[2].Value.ToLower());
        }

    }

    public static class PageExtensions
    {
        private static string ToHtmlAttributes(object d)
        {
            if (d == null)
                return null;

            var dict = new HtmlAttributes();
            dict.ApplyObject(d);

            return dict.ToHtmlAttributes();
        }
        public static string Script(this Page p, string moduleUri)
        {
            var uri = new Uri(moduleUri);
            var url = p.ResolveClientUrl("~/api/modules/script/" + uri.Host + "/" + Path.GetFileName(uri.AbsolutePath) + "?l=" + CultureInfo.CurrentUICulture.Name);
            return "<script src=\"" + HttpUtility.HtmlAttributeEncode(url) + "\"></script>";
        }

        public static string DatePicker<TModel>(this IPageModel<TModel> p, Expression<Func<TModel, DateTime>> model, string format, object htmlAttributes = null) 
            where TModel : class
        {
            var reader = ModelReader<TModel>.Create(p.Model);
            var selected = reader.Read(model);
            var name = reader.Lookup(model);

            var sb = new StringBuilder();
            var attributes = new HtmlAttributes();
            attributes.ApplyObject(htmlAttributes);

            attributes["type"] = "text";
            attributes["class"] = "ui-input";
            attributes["name"] = name;
            attributes["value"] = selected.ToString(format);

            sb.AppendFormat("<input {0} />", attributes.ToHtmlAttributes());

            return sb.ToString();
        }

        sealed class ModelReader<T>
        {
            private PropertyDescriptorCollection _properties;
            private T _instance;

            internal static ModelReader<T> Create(T instance)
            {
                try
                {
                var m = new ModelReader<T>();
                m._properties = TypeDescriptor.GetProperties(typeof(T));
                m._instance = instance;
                return m;
                }
                catch (Exception ex)
                {
                    throw new Exception(string.Format("Error while trying to create the model reader ({0}).", ex.GetType().Name), ex);
                }
            }

            internal TR Read<TR>(Expression<Func<T, TR>> expr)
            {
                var name = Lookup(expr);
                
                try
                {
                    return (TR)this._properties[name].GetValue(_instance);
                }
                catch (Exception ex)
                {
                    throw new Exception(string.Format("Unable to read model value from expression: {0} ({1}).", expr, ex.GetType().Name), ex);
                }
            }

            internal string Lookup<TM, T>(Expression<Func<TM, T>> expression)
            {
                try
                {
                    var memberExpression = expression.Body as MemberExpression;
                    if (memberExpression == null)
                        throw new Exception(string.Format("Expression body is not a MemberExpression (it is a {0}).", expression.Body.GetType().Name));

                    return memberExpression.Member.Name;
                }
                catch (Exception ex)
                {
                    throw new Exception(string.Format("Unable to lookup property name from expression: {0} ({1}).", expression, ex.GetType().Name), ex);
                }
            }
        }

        public static string DatePickerNullable<TModel>(this IPageModel<TModel> p, Expression<Func<TModel, DateTime?>> model, string format, object htmlAttributes = null, 
            bool enabled = true) where TModel : class
        {
            return DatePickerNullable<TModel, DateTime>(p, model, format, htmlAttributes);
        }

        public static string DatePickerNullable<TModel>(this IPageModel<TModel> p, Expression<Func<TModel, DateTimeOffset?>> model, string format, object htmlAttributes = null, 
            bool enabled = true) where TModel : class
        {
            return DatePickerNullable<TModel, DateTimeOffset>(p, model, format, htmlAttributes);
        }

        /// <summary>
        /// Creates a DatePicker control for both DateTime? and DateTimeOffset?.
        /// </summary>
        /// <typeparam name="TModel">Type of the view model</typeparam>
        /// <typeparam name="TData">Either DateTime or DateTimeOffset</typeparam>
        private static string DatePickerNullable<TModel, TData>(IPageModel<TModel> p, Expression<Func<TModel, Nullable<TData>>> model, string format, object htmlAttributes)
            where TModel: class
            where TData : struct, IFormattable
        {
            var reader = ModelReader<TModel>.Create(p.Model);
            var selected = reader.Read(model);
            var name = reader.Lookup(model);
            var value = selected.HasValue ? selected.Value.ToString(format, CultureInfo.CurrentCulture) : "";

            var sb = new StringBuilder();
            var attributes = new HtmlAttributes();
            attributes.ApplyObject(htmlAttributes);

            attributes["type"] = "text";
            attributes["class"] = "ui-input";
            attributes["name"] = name;
            attributes["value"] = value;

            sb.AppendFormat("<input {0} />", attributes.ToHtmlAttributes());

            return sb.ToString();
        }

        public static string ComboBox<TModel, T, TS>(this IPageModel<TModel> p, Expression<Func<TModel, T>> model, IEnumerable<TS> source, string value, string text, 
            bool emptyText = false, object htmlAttributes = null) where TModel : class
        {
            var reader = ModelReader<TModel>.Create(p.Model);
            var selected = reader.Read(model);
            var name = reader.Lookup(model);

            var sb = new StringBuilder();
            sb.AppendFormat("<select name=\"{0}\" {1}>", name, ToHtmlAttributes(htmlAttributes));

            if (emptyText)
            {
                var valueValue = string.Empty;
                var textValue = string.Empty;
                sb.AppendFormat("<option value=\"{0}\" {1}>{2}</option>", valueValue, (Equals(null, selected) ? "selected" : ""), textValue);
            }

            var ps = TypeDescriptor.GetProperties(typeof(TS));
            foreach (var VARIABLE in source)
            {
                if(ps[value] == null)
                    throw new Exception(String.Format("Property with name '{0}' could not be found in '{1}'", value, typeof(TS).ToString()));
                var o = ps[value].GetValue(VARIABLE);
                var optionValue = HttpUtility.HtmlAttributeEncode((o ?? string.Empty).ToString());
                var optionText = HttpUtility.HtmlEncode(ps[text].GetValue(VARIABLE)?.ToString());
                sb.AppendFormat("<option value=\"{0}\" {1}>{2}</option>", optionValue, (Equals(o, selected) ? "selected" : ""), optionText);
            }
            sb.Append("</select>");

            return sb.ToString();
        }

        public static string TextBox<TModel, T>(this IPageModel<TModel> p, Expression<Func<TModel, T>> model, object htmlAttributes = null) where TModel : class
        {
            var reader = ModelReader<TModel>.Create(p.Model);
            var value = HttpUtility.HtmlEncode(reader.Read(model)?.ToString());
            var name = HttpUtility.HtmlAttributeEncode(reader.Lookup(model));

            var sb = new StringBuilder();
            sb.AppendFormat("<input name=\"{0}\" value=\"{1}\" class=\"ui-input\" {2}/>", name, value, ToHtmlAttributes(htmlAttributes));

            return sb.ToString();
        }

        public static string TextArea<TModel, T>(this IPageModel<TModel> p, Expression<Func<TModel, T>> model, object htmlAttributes = null, bool enabled = true) 
            where TModel : class
        {
            var reader = ModelReader<TModel>.Create(p.Model);
            var value = HttpUtility.HtmlEncode(reader.Read(model)?.ToString());
            var name = HttpUtility.HtmlAttributeEncode(reader.Lookup(model));

            var sb = new StringBuilder();
            if (enabled)
                sb.AppendFormat("<textarea name=\"{0}\" class=\"ui-input\" {2}>{1}</textarea>", name, value, ToHtmlAttributes(htmlAttributes));
            else
                sb.AppendFormat("<textarea name=\"{0}\" disabled=\"disabled\" class=\"ui-input\" {2}>{1}</textarea>", name, value, ToHtmlAttributes(htmlAttributes));

            return sb.ToString();
        }

        public static string Password<TModel, T>(this IPageModel<TModel> p, Expression<Func<TModel, T>> model) where TModel : class
        {
            var reader = ModelReader<TModel>.Create(p.Model);
            var selected = HttpUtility.HtmlAttributeEncode(reader.Read(model)?.ToString());
            var name = HttpUtility.HtmlAttributeEncode(reader.Lookup(model));

            var sb = new StringBuilder();
            sb.AppendFormat("<input name=\"{0}\" type=\"password\" value=\"{1}\" class=\"ui-input\"/>", name, selected);

            return sb.ToString();
        }

        public static string Submit<TModel>(this IPageModel<TModel> p, Expression<Func<TModel, bool>> model, string text, object htmlAttributes = null) where TModel : class
        {
            var reader = ModelReader<TModel>.Create(p.Model);
            var name = HttpUtility.HtmlAttributeEncode(reader.Lookup(model));

            var sb = new StringBuilder();
            sb.AppendFormat("<input name=\"{0}\" class=\"btn\" type=\"submit\" value=\"{1}\" {2} />", name, HttpUtility.HtmlAttributeEncode(text), ToHtmlAttributes(htmlAttributes));

            return sb.ToString();
        }

        public static string CheckBox<TModel, T>(this IPageModel<TModel> p, Expression<Func<TModel, T>> model, object htmlAttributes = null) where TModel : class
        {
            var reader = ModelReader<TModel>.Create(p.Model);
            var selected = reader.Read(model).AsValueType(false);
            var name = HttpUtility.HtmlAttributeEncode(reader.Lookup(model));

            var sb = new StringBuilder();
            sb.AppendFormat("<input name=\"{0}\" type=\"checkbox\" value=\"{0}\" {1} {2} />", name, selected ? "checked" : "", ToHtmlAttributes(htmlAttributes));

            return sb.ToString();
        }

        public static string Hidden<TModel, T>(this IPageModel<TModel> p, Expression<Func<TModel, T>> model) where TModel : class
        {
            var reader = ModelReader<TModel>.Create(p.Model);
            var value = HttpUtility.HtmlAttributeEncode(reader.Read(model)?.ToString());
            var name = HttpUtility.HtmlAttributeEncode(reader.Lookup(model));

            var sb = new StringBuilder();
            sb.AppendFormat("<input name=\"{0}\" type=\"hidden\" value=\"{1}\" />", name, value);

            return sb.ToString();
        }
    }
}

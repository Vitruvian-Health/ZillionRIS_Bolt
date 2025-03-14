using DelftDI.ZillionRis.Logging;
using Rogan.ZillionRis.EntityData;
using Rogan.ZillionRis.Web.Handlers.Razor;
using Rogan.ZillionRis.WebControls.Common;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Threading;
using System.Web;
using ZillionRis.Common;

namespace ASP
{
    public class RisRazorBase : RazorBase
    {
        public new RisApplication Application
        {
            get { return (RisApplication) base.Application; }
        }

        public IZillionRIS_Entities Database
        {
            get
            {
                return Application.GetSessionContext().DataContext; 
            }
        }

        public Dictionary<string, object> ViewData { get; set; }

        public string IncludePaths()
        {
            const string script = @"$.extend(true, window, {{ ZillionRis: {{ AbsoluteUrl: function(url) {{ return {2}+url; }}, ApiUrl: function(url) {{ return {0}+url; }}, PageUrl: function(url) {{ return {1}+url; }} }} }});";

            var format = String.Format(script,
                this.ResolveClientUrl("~/api/").ToJsStringLiteral(),
                this.ResolveClientUrl("~/").ToJsStringLiteral(),
                new Uri(this.Application.Request.Url, this.ResolveClientUrl("~/")).ToString().ToJsStringLiteral());

            return format;
        }

        public string IncludeScript(string path)
        {
            return "<script src=\"" + this.ResolveClientUrl(path) + "\"></script>";
        }

        public string RenderPart(string path, Dictionary<string, object> model = null)
        {
            return RazorCompilerFromFile.Instance.ExecuteTemplateFromFile(this.Application.Server.MapPath(path), Application, model);
        }

        public string ResolveClientUrl(string virtualPath)
        {
            return VirtualPathUtility.ToAbsolute(virtualPath);
        }

        protected virtual void InitializeCulture()
        {
            string language = null;
            try
            {
                language = this.Application.Language;
                if (language != null)
                {
                    Thread.CurrentThread.CurrentUICulture = CultureInfo.GetCultureInfo(language);

                    try
                    {
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


        //
        // Following methods are needed for compiling th cshtml filesbased on razor.
        // Switched on by MvcBuildViews in the the csproj file.
        // https://github.com/Antaris/RazorEngine/issues/476
        //

        protected void BeginContext(
            string virtualPath,
            int startPosition,
            int length,
            bool isLiteral)
        {
        }

        protected void EndContext(
            string virtualPath,
            int startPosition,
            int length,
            bool isLiteral
        )
        {
        }

        protected FakeContext Context { get; set; }

        public class FakeContext
        {
            public object ApplicationInstance { get; set; }
        }
    }
}

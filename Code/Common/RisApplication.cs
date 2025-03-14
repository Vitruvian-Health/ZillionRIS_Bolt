using DelftDI.Common.RIS.Common;
using DelftDI.Common.RIS.Utilities;
using DelftDI.ZillionRis.Licensing;
using DelftDI.ZillionRis.Logging;
using EmbeddedResourceVirtualPathProvider;
using Microsoft.Practices.Unity;
using Microsoft.Practices.Unity.Configuration;
using Rogan.Text.ShortCodes.Web;
using Rogan.ZillionRis;
using Rogan.ZillionRis.AuditTrail;
using Rogan.ZillionRis.Authentication;
using Rogan.ZillionRis.Business;
using Rogan.ZillionRis.Calendars;
using Rogan.ZillionRis.CancelledExaminations;
using Rogan.ZillionRis.Configuration;
using Rogan.ZillionRis.CustomFilters;
using Rogan.ZillionRis.Data;
using Rogan.ZillionRis.Dictation;
using Rogan.ZillionRis.Dictation.Digital;
using Rogan.ZillionRis.Dictation.InterActive;
using Rogan.ZillionRis.Dictation.LastAccessed;
using Rogan.ZillionRis.Dictation.Speech;
using Rogan.ZillionRis.Dictation.Text;
using Rogan.ZillionRis.Engine;
using Rogan.ZillionRis.EntityData;
using Rogan.ZillionRis.EntityData.SimpleDataQuery;
using Rogan.ZillionRis.ExaminationDiscussion;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Extensibility.Audit;
using Rogan.ZillionRis.Extensibility.Audit.Comparers;
using Rogan.ZillionRis.Extensibility.Audit.Models;
using Rogan.ZillionRis.Extensibility.Data;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.Extensibility.UI;
using Rogan.ZillionRis.Extentions;
using Rogan.ZillionRis.FailSafe;
using Rogan.ZillionRis.Globalization;
using Rogan.ZillionRis.Housekeeping;
using Rogan.ZillionRis.HtmlEditor;
using Rogan.ZillionRis.LastAccessed;
using Rogan.ZillionRis.Login;
using Rogan.ZillionRis.Panels;
using Rogan.ZillionRis.Performance;
using Rogan.ZillionRis.Portering;
using Rogan.ZillionRis.Protocols;
using Rogan.ZillionRis.Reception;
using Rogan.ZillionRis.Reporting;
using Rogan.ZillionRis.Reporting.Core;
using Rogan.ZillionRis.ScriptServer;
using Rogan.ZillionRis.Security;
using Rogan.ZillionRis.Session;
using Rogan.ZillionRis.Shell;
using Rogan.ZillionRis.Statistics;
using Rogan.ZillionRis.Statistics.Web;
using Rogan.ZillionRis.StoredDocuments.Extensibility;
using Rogan.ZillionRis.StoredDocuments.Web;
using Rogan.ZillionRis.Technician;
using Rogan.ZillionRis.Utilities;
using Rogan.ZillionRis.ViewModels.Examinations;
using Rogan.ZillionRis.Web;
using Rogan.ZillionRis.Web.Configuration;
using Rogan.ZillionRis.Web.Data;
using Rogan.ZillionRis.Web.Handlers;
using Rogan.ZillionRis.Web.Handlers.ReflectionRequest;
using Rogan.ZillionRis.Web.Runtime;
using Rogan.ZillionRis.Web.Shared;
using Rogan.ZillionRis.WebControls;
using Rogan.ZillionRis.Website.App_GlobalResources;
using Rogan.ZillionRis.Website.Code.Api;
using Rogan.ZillionRis.Website.Code.Common;
using Rogan.ZillionRis.Website.Code.Controls.ModulePages;
using Rogan.ZillionRis.Website.Code.Legacy;
using Rogan.ZillionRis.Workflow;
using Rogan.ZillionRis.Workflow.PersonCards;
using Rogan.ZillionRis.Workflow.PersonCards.Providers;
using Rogan.ZillionRis.Worklist;
using System;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Reflection;
using System.Security.Authentication;
using System.Web;
using System.Web.Compilation;
using System.Web.Hosting;
using System.Web.Routing;

namespace ZillionRis.Common
{
    /// <summary>
    ///     The RIS application class provides commonly used functionality and global validation checks.
    /// </summary>
    public class RisApplication : HttpApplication, IRisApplication, ISessionRisRequest
    {
        private static readonly SystemUserDefinition WebApplicationUser = SystemUserDefinition.Define("Web Application User", "WebApplication");

        private static List<IApplicationService> _applicationServices = new List<IApplicationService>();

        #region Constants
        public const UserInformationLevel DefaultInformationLevel = UserInformationLevel.Normal;
        #endregion

        #region Fields
        private static readonly AssemblyVersionInformationCollection AssemblyVersionInfo = new AssemblyVersionInformationCollection();
        #endregion

        #region AppStat
        private static readonly AppStatDefintion AppStat_ApplicationStart = AppStat.Define("web-application-start");
        private static readonly AppStatDefintion AppStat_ApplicationRequest = AppStat.Define("web-application-request");
        private static readonly AppStatDefintion AppStat_ApplicationError = AppStat.Define("web-application-error");
        #endregion

        #region Properties
        /// <summary>
        ///     Gets the assembly versions.
        /// </summary>
        /// <value>The assembly versions.</value>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-09-01.</para>
        /// </remarks>
        public IEnumerable<AssemblyVersionInformation> AssemblyVersions
        {
            get { return AssemblyVersionInfo; }
        }

        /// <summary>
        ///     Gets the RIS application instance for the current Web request.
        /// </summary>
        /// <value>The current.</value>
        public static RisApplication Current
        {
            get { return (RisApplication) HttpContext.Current.ApplicationInstance; }
        }

        /// <summary>
        ///     Gets or sets the last exception caught from logging.
        /// </summary>
        /// <value>The last exception caught from logging.</value>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-09-27.</para>
        /// </remarks>

        private static List<Exception> _initializeException = new List<Exception>();
        public List<Exception> InitializationExceptions
        {
            get => _initializeException;
            set => _initializeException = value;
        }

        /// <summary>
        ///     Gets or sets the information level for the current session.
        /// </summary>
        /// <value>
        ///     The information level.
        /// </value>
        /// <remarks>
        ///     <para>Created by tdgroen at 2011-11-23.</para>
        /// </remarks>
        public UserInformationLevel InformationLevel
        {
            get
            {
                // User configuration always wins
                if (_customUserInformationLevel != null)
                {
                    return _customUserInformationLevel.Value;
                }

                var context = Context;
                if (context == null)
                {
                    return DefaultInformationLevel;
                }

                if (!context.Request.IsLocal)
                {
                    return DefaultInformationLevel;
                }

                // Always expert level on local host, except for demos.
                var isDemo = RisAppSettings.Demo;

                return isDemo == false ? UserInformationLevel.Expert : DefaultInformationLevel;
            }
            set { _customUserInformationLevel = value; }
        }

        private UserInformationLevel? _customUserInformationLevel;

        /// <summary>
        ///     Gets or sets the language for the current user.
        /// </summary>
        /// <remarks>
        ///     This property uses the session variable <c>Language</c> (in <see cref="RisApplication.Session" />).
        /// </remarks>
        /// <value>The language.</value>
        public string Language
        {
            get
            {
                var httpCookie = Request.Cookies.Get("lang");
                if (httpCookie == null) return null;

                return httpCookie.Value;
            }
            set { Response.Cookies.Set(new HttpCookie("lang", value) { Expires = DateTime.UtcNow.AddYears(10) }); }
        }
        #endregion

        #region Constructors
        /// <summary>
        ///     Initializes the <see cref="RisApplication" /> class.
        /// </summary>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-09-27.</para>
        /// </remarks>
        static RisApplication()
        {
            AssemblyVersionInfo.AddAssembly(typeof (ControllerBase), @"Zillion RIS - Common");
            AssemblyVersionInfo.AddAssembly(typeof (ZillionRIS_Entities), @"Zillion RIS - Data Access Layer");
            AssemblyVersionInfo.AddAssembly(typeof (ControlBase), @"Zillion RIS - Web Controls");
            AssemblyVersionInfo.AddAssembly(typeof (RisApplication), @"Zillion RIS - Web Application");

            AssemblyVersionInfo.AddAssembly(typeof (CodeExtensions), @"Rogan Common Library");
            AssemblyVersionInfo.AddAssembly(typeof (ReflectionController), @"Rogan Zillion Parts Library");

            SimpleDataQuerySettings.DefaultSettings.TraceSql = false;
        }
        #endregion

        #region Private/Protected Methods
        public static ModuleManager ModuleManager { get; private set; }

        /// <summary>
        ///     Handles the End event of the Application control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">
        ///     The <see cref="System.EventArgs" /> instance containing the event data.
        /// </param>
        /// <remarks>
        ///     26022010 RN: Stop the thread and wait for it to finish
        /// </remarks>
        protected void Application_End(object sender,
            EventArgs e)
        {
            // Request the thread to stop.
            StopApplicationServices();

            ZillionRisEngineHost.Instance.Stop();
        }

        private void StopApplicationServices()
        {
            foreach (var applicationService in _applicationServices)
                applicationService.OnStop();
            _applicationServices.Clear();
        }

        private void StartApplicationServices()
        {
            try
            {
                // Create the new thread.
                _applicationServices = IocContainer.Instance.AllOf<IApplicationService>().ToList();
                foreach (var service in _applicationServices)
                {
                    ZillionRisLog.Default.Write(ZillionRisLogLevel.Notice, $"Starting application service {service.GetType().FullName}");
                    service.OnStart();
                }
            }
            catch (Exception ex)
            {
                LogError("StartApplicationServices", ex);

                throw new ApplicationException(@"Failed to start on or more application services.", ex);
            }
        }

        public DisposableContainer RequestDisposableContainer
        {
            get { return Context.Items["DisposableContainer"] as DisposableContainer; }
        }

        protected void Application_EndRequest(object sender, EventArgs e)
        {
            GetSessionContext().DisposeAll();
        }

        protected void Application_BeginRequest(object sender, EventArgs e)
        {
            AppStat_ApplicationRequest.AddOne();

            Context.Items["ClientID"] = GetClientIDFromHttpContext(Context);
            Context.Items["RequestID"] = Guid.NewGuid().ToString(); // Base36.NewBase36().ToString();
            Context.Items["DisposableContainer"] = new DisposableContainer();

            if (ModuleManager != null)
            {
                var httpContext = Context;
                if (httpContext != null)
                {
                    httpContext.Items["ModuleContext"] = CreateModuleContext();
                }
            }

            var sessionContext = GetSessionContext();
            if (sessionContext.User != null)
            {
                if (sessionContext.GetAuthorization().IsActive())
                {
                    return;
                }

                LogoffUser("inactive");
                Response.End();
            }
            else if (Context.GetLoginName() != null)
            {
                LogoffUser("invalid");
                Response.End();
            }
        }

        /// <summary>
        ///     Handles the Error event of the Application control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">
        ///     The <see cref="System.EventArgs" /> instance containing the event data.
        /// </param>
        protected void Application_Error(object sender, EventArgs e)
        {
            AppStat_ApplicationError.AddOne();

            var sessionContext = TryCreateSessionContext();
            var lastError = Server.GetLastError();

            //Log the last error
            ZillionRisLog.Default.WriteError(
                $"Exception occurred during a request to {Context.Request.Url}.\r\nReferrer: {Context.Request.UrlReferrer}",sessionContext,  lastError);

            //Log the other errors
            Context.AllErrors.ForEach(error =>
                {
                    if (lastError != error &&  (IsExceptionIgnorable(error) == false))
                    {
                        ZillionRisLog.Default.WriteError(
                            $"Other Exceptions during a request to {Context.Request.Url}.\r\nReferrer: {Context.Request.UrlReferrer}", sessionContext, error);
                    }
                }
            );
            
            //Clear the errors
            Server.ClearError();
        }

        private bool IsExceptionIgnorable(Exception error)
        {
            var httpException = error as HttpException;

            if (httpException == null) 
            {
                return false;
            }

            if (httpException.ErrorCode == 0x800704CD)
            {
                // The remote host closed the connection.
                return true;
            }

            if (httpException.Message.Contains("The remote host closed the connection"))
            {
                // Owww you! Microsoft!
                //
                //    (\_/)
                //   (='.'=)
                //   (")_(")
                return true;
            }

            return false;
        }

        private ISessionContext TryCreateSessionContext()
        {
            ISessionContext sessionContext;
            try
            {
                sessionContext = GetSessionContext();
            }
            catch
            {
                sessionContext = null;
            }
            return sessionContext;
        }

        /// <summary>
        ///     Handles the Start event of the Application control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">
        ///     The <see cref="System.EventArgs" /> instance containing the event data.
        /// </param>
        /// <remarks>
        ///     26022010 RN: Create a new thread to pick up messages from the queue
        /// </remarks>
        protected void Application_Start(object sender,
            EventArgs e)
        {
            AppStat_ApplicationStart.AddOne();

            try
            {
                ConfigureUnity();
            }
            catch (Exception ex)
            {
                InitializationExceptions.Add(new ApplicationException(@"Failed to initialize the modules.", ex));
            }

            try
            {
                //Initialize the logger
                ZillionRisLog.Default.Initialize();
                ZillionRisLog.Default.Write(ZillionRisLogLevel.Notice, "Starting up Zillion RIS");

                //Register the RisLicenseManager
                try
                {
                    ZillionRisLog.Default.Write(ZillionRisLogLevel.Notice, "Initialize License Manager");
                    var risLicenseManager = new RisLicenseManager();
                    IocContainer.Instance.Container.RegisterInstance<IRisLicenseManager>(risLicenseManager);
                }
                catch (Exception ex)
                {
                    LogError("Exception Initializing the License Manager", ex);
                    InitializationExceptions.Add(new ApplicationException(@"Failed to initialize the License Manager", ex));
                }

                try
                {
                    // Register the UserAuthorizationFactory
                    ZillionRisLog.Default.Write(ZillionRisLogLevel.Notice, "Initialize User Authorization Factory");
                    IocContainer.Instance.Container.RegisterInstance<IUserAuthorizationFactory>(new UserAuthorizationFactory());
                }
                catch (Exception ex)
                {
                    LogError("Failed to initialize the User Authorization Factory", ex);
                    InitializationExceptions.Add(new ApplicationException(@"Failed to initialize the User Authorization Factory", ex));
                }

                try
                {
                    ZillionRisLog.Default.Write(ZillionRisLogLevel.Notice, "Verify Databse tables");
                    VerifyDatabaseViewsAvailable();
                }
                catch (Exception ex)
                {
                    LogError("Problem with the database views.", ex);
                    InitializationExceptions.Add(new ApplicationException(@"There is a problem with the database views, unable to initialize the RIS. Technical details: Upgrade the system.", ex));
                }


                try
                {
                    ZillionRisLog.Default.Write(ZillionRisLogLevel.Notice, "Loading business rules");
                    LoadBusinessRules();
                }
                catch (Exception ex)
                {
                    LogError("Failed to load the business rules.", ex);
                    InitializationExceptions.Add(new ApplicationException(@"Failed to load the business rules.", ex));
                }

                try
                {
                    ZillionRisLog.Default.Write(ZillionRisLogLevel.Notice, "Initializing engine");
                    InitializeEngine();
                }
                catch (Exception ex)
                {
                    LogError("Failed to initialize the engine.", ex);
                    InitializationExceptions.Add(new ApplicationException(@"Failed to initialize the engine.", ex));
                }

                try
                {
                    ZillionRisLog.Default.Write(ZillionRisLogLevel.Notice, "Initializing modules");
                    ModuleManager = new ModuleManager();

                    ZillionRisLog.Default.Write(ZillionRisLogLevel.Notice, "Registering database components");
                    RegisterDatabaseConnections();

                    ZillionRisLog.Default.Write(ZillionRisLogLevel.Notice, "Loading build in unity components");
                    RegisterBuildInUnity();
                    ZillionRisLog.Default.Write(ZillionRisLogLevel.Notice, "Loading fallback modules");
                    RegisterFallbackUnity();

                    ZillionRisLog.Default.Write(ZillionRisLogLevel.Notice, "Loading build in modules");
                    RegisterBuildInModules();
                    ZillionRisLog.Default.Write(ZillionRisLogLevel.Notice, "Loading configured modules");
                    RegisterConfiguredModules();

                    IocContainer.Instance.EnsureRegistrations();
                    
                }
                catch (Exception ex)
                {
                    LogError("Failed to initialize the modules.", ex);
                    InitializationExceptions.Add(new ApplicationException(@"Failed to initialize the modules.", ex));
                }

                try
                {
                    ZillionRisLog.Default.Write(ZillionRisLogLevel.Notice, "Broadcast engine initialize");
                    BroadcastIntent(new Intent { Action = WebControlsIntent.EngineInit });
                }
                catch (Exception ex)
                {
                    LogError("Failed to initialize the engine modules.", ex);
                    InitializationExceptions.Add(new ApplicationException(@"Failed to initialize the engine modules.", ex));
                }

                // Try to start the thread to receive messages.
                ZillionRisLog.Default.Write(ZillionRisLogLevel.Notice, "Starting application services");
                StartApplicationServices();

                try
                {
                    ZillionRisLog.Default.Write(ZillionRisLogLevel.Notice, "Broadcast application initialize");
                    BroadcastIntent(new Intent { Action = WebControlsIntent.AppInit });
                }
                catch (Exception ex)
                {
                    LogError("Unexpected error while informing modules of application initialization.", ex);
                    InitializationExceptions.Add(new ApplicationException(@"Unexpected error while informing modules of application initialization.", ex));
                }

                try
                {
                    ZillionRisLog.Default.Write(ZillionRisLogLevel.Notice, "Initializing ASP.NET route table");
                    RegisterRoutes(RouteTable.Routes);
                }
                catch (Exception ex)
                {
                    LogError("Failed to register HTTP routes.", ex);
                    InitializationExceptions.Add(new ApplicationException(@"Failed to register HTTP routes.", ex));
                }

                try
                {
                    ZillionRisLog.Default.Write(ZillionRisLogLevel.Notice, "Registering module pages");
                    RegisterModulePages();
                }
                catch (Exception ex)
                {
                    LogError("Unexpected error while resolving module pages.", ex);
                    InitializationExceptions.Add(new ApplicationException(@"Unexpected error while resolving module pages.", ex));
                }

                // Register ChangeResolvers for auditing.
                try
                {
                    ZillionRisLog.Default.Write(ZillionRisLogLevel.Notice, "Registering ChangeResolvers");
                    AuditManager.RegisterFor<List<RescheduleAuditModel>, List<RescheduleAuditModel>>(new RescheduleComparer());
                    AuditManager.RegisterFor<EditOrderChangeResolver.OrderSnapshot, EditOrderChangeResolver.OrderSnapshot>(new EditOrderChangeResolver());
                }
                catch (Exception ex)
                {
                    LogError("Unexpected error while registering change resolvers for auditing.", ex);

                    InitializationExceptions.Add(new ApplicationException("Unexpected error while registering change resolvers for auditing."));
                }

                try
                {
                    ZillionRisLog.Default.Write(ZillionRisLogLevel.Notice, "Initializing bundles");
                    InitializeBundles();
                }
                catch (Exception ex)
                {
                    LogError("Failed to initialize bundles.", ex);
                    InitializationExceptions.Add(new ApplicationException(@"Failed to initialize bundles.", ex));
                }

                try
                {
                    ZillionRisLog.Default.Write(ZillionRisLogLevel.Notice, "Broadcast application engine start");
                    BroadcastIntent(new Intent { Action = WebControlsIntent.EngineRun });
                }
                catch (Exception ex)
                {
                    LogError("Unexpected error while informing modules of application start.", ex);

                    InitializationExceptions.Add(new ApplicationException(@"Unexpected error while informing modules of application start.", ex));
                }

                try
                {
                    ZillionRisLog.Default.Write(ZillionRisLogLevel.Notice, "Broadcast application resume");
                    BroadcastIntent(new Intent { Action = WebControlsIntent.AppResume });
                }
                catch (Exception ex)
                {
                    LogError("Unexpected error while informing modules of application start.", ex);

                    InitializationExceptions.Add(new ApplicationException(@"Unexpected error while informing modules of application start.", ex));
                }

                EnableWebFormsSupportForModules();

                ZillionRisLog.Default.Write(ZillionRisLogLevel.Notice, "Zillion RIS start up complete");
            }
            catch (Exception ex)
            {
                LogError("Exception", ex);
                InitializationExceptions.Add(ex);
            }

            ZillionRisLog.Default.Write(ZillionRisLogLevel.Notice, "Finished Application Start");
        }

        /// <summary>
        ///     This will enable the modules to embed WebForms pages.
        ///     To make a WebForms page in a module available, set the build action of the aspx file to "Embedded Resource".
        /// </summary>
        private static void EnableWebFormsSupportForModules()
        {
            // Scan all Rogan.ZillionRis.* assemblies for embedded resources
            var assemblies = BuildManager.GetReferencedAssemblies()
                .Cast<Assembly>()
                .Where(a => a.GetName().Name.StartsWith("Rogan.ZillionRis", StringComparison.InvariantCulture));
            HostingEnvironment.RegisterVirtualPathProvider(new Vpp(assemblies.ToArray()));
        }

        private static void VerifyDatabaseViewsAvailable()
        {
            ZillionRisLog.Default.Write(ZillionRisLogLevel.Notice, "Verifying access to the database views.");

            using (var dc = new ZillionRIS_Entities())
            {
                var sql = dc.GetSqlConnection();
                if (sql == null)
                {
                    return;
                }

                if (sql.State == ConnectionState.Closed)
                {
                    try
                    {
                        sql.Open();
                    }
                    catch (Exception ex)
                    {
                        throw new ApplicationException("Unable to connect to the database.", ex);
                    }
                }

                if (DatabaseHasView(sql, "vw_DictationWorklist") == false)
                    throw new Exception("Dictation view not found.");
                if (DatabaseHasView(sql, "vw_LocationsView") == false)
                    throw new Exception("Locations view not found.");
                if (DatabaseHasView(sql, "vw_IntermediateView") == false)
                    throw new Exception("Intermediate study view not found.");
                if (DatabaseHasView(sql, "vw_ExaminationsWorklist") == false)
                    throw new Exception("Examinations worklist view not found.");
                if (DatabaseHasView(sql, "vw_OrdersWorklist") == false)
                    throw new Exception("Orders view not found.");
                if (DatabaseHasView(sql, "vw_DictationWorkItemWorklist") == false)
                    throw new Exception("Dictation work item view not found.");
                if (DatabaseHasView(sql, "vw_SpeechStateView") == false)
                    throw new Exception("Speech state view not found.");
                if (DatabaseHasView(sql, "vw_HousekeepingWorklist") == false)
                    throw new Exception("Housekeeping view not found.");
                if (DatabaseHasView(sql, "vw_SpeechStateWorklist") == false)
                    throw new Exception("Speech state worklist not found.");
                if (DatabaseHasView(sql, "vw_FailsafeWorklist") == false)
                    throw new Exception("Failsafe view not found.");
            }
        }

        private static bool DatabaseHasView(SqlConnection sql, string tableName)
        {
            bool found;
            var sqlCommand = sql.CreateCommand();
            using (var command = sqlCommand)
            {
                var sqlText = "SELECT COUNT(*) FROM information_schema.views WHERE table_name = @TableName";
                command.CommandText = sqlText;
                var sqlParameter = command.CreateParameter();
                sqlParameter.ParameterName = "TableName";
                sqlParameter.DbType = DbType.String;
                sqlParameter.Value = tableName;
                command.Parameters.Add(sqlParameter);
                found = (int) command.ExecuteScalar() > 0;
            }
            return found;
        }

        protected void Application_PostAcquireRequestState(object sender,
            EventArgs e)
        {
            LoginTicketConcerns.AttemptLoginTicket(this, Context, Request.Params["ticket"]);
        }

        private static void InitializeEngine()
        {
            var dataContext = new ZillionRIS_Entities();
            RisGlobalCache.Renew(dataContext);

            var engine = ZillionRisEngineHost.Instance.Engine;
            engine.AddComponent(new RisGlobalCacheRenewalComponent(), TimeSpan.FromSeconds(30d));
            engine.AddComponent(new AuthorizationInformationCacheRenewalComponent(), TimeSpan.FromSeconds(30d));

            // Speech.
            engine.AddComponent(new DictationWorkItemCleanupComponent(), TimeSpan.FromHours(1d));

            // Register application settings cache invalidation component.
            ConfigurationConcerns.RegisterCacheInvalidateComponent(engine);
        }

        private void RegisterRoutes(RouteCollection routes)
        {
            ZillionRisWebApi.RegisterRoutes(routes);

            var moduleContext = CreateModuleContext();
            routes.Add(new Route("api/modules/{type}/{module}/{identifier}", new ModuleRouteHandler(moduleContext)));
            routes.Add(new Route("document/{identifier}", new DocumentRouteHandler()));
            routes.Add(new Route("document/{requesttype}/{identifier}", new DocumentRouteHandler()));
            routes.Add(new Route("qanda/{identifier}", new QandARouteHandler()));
            routes.Add(new Route("qanda/{requesttype}/{identifier}", new QandARouteHandler()));
            routes.Add(new Route("api/bundled/{code}", new BundledHttpRoute {ModuleContext = moduleContext, Provider = _codeProvider}));

            routes.MapPageRoute("PageReception", "reception/", "~/ReceptionLow.aspx");
            routes.MapPageRoute("PageImaging", "imaging/", "~/Imaging.aspx");
            routes.MapPageRoute("PageHousekeeping", "housekeeping/", "~/Housekeeping.aspx");
            routes.MapPageRoute("PageWorklist", "worklist/", "~/Dictation/Worklist.aspx");
            routes.MapPageRoute("PagePatientSearch", "patient/search/", "~/PatientSearch.aspx");
            routes.MapPageRoute("PageAdvancedPatientSearch", "advanced/patient/search/", "~/frmAdvancedPatientSearch.aspx");
            routes.MapPageRoute("PagePortering", "portering/", "~/Portering.aspx");
            routes.MapPageRoute("PageService", "service/", "~/Service.aspx");
            routes.MapPageRoute("PageStandardReport", "standardreport/", "~/Dictation/StandardReport.aspx");
        }
        #endregion

        #region Workflow Modules
        public void RegisterBuildInModules()
        {
            // External Components.
            ModuleManager.Register(new ShortCodesModuleBuilder().CreateModule());
            ModuleManager.Register(new ScriptServerModule().Create());
            ModuleManager.Register(new HtmlEditorModuleBuilder().Create());

            // Components.
            ModuleManager.Register(new ShellModule().Create());
            ModuleManager.Register(new WorkflowModule().Create());
            ModuleManager.Register(new LastAccessedModuleBuilder().CreateModule());
            ModuleManager.Register(new StatisticsModuleBuilder().CreateModule());
            ModuleManager.Register(new LegacyModuleBuilder().CreateModule());
            ModuleManager.Register(new CalendarsModuleBuilder().Create());
            ModuleManager.Register(new PerformanceModule().Create());

            // Pages.
            ModuleManager.Register(new ReceptionModule().Create());
            ModuleManager.Register(new TechnicianWorkflowModule().Create());
            ModuleManager.Register(new HousekeepingModule().Create());
            ModuleManager.Register(new PorteringModule().Create());

            // Default Modules.
            ModuleManager.Register(new ZillionRisWebModule().Create());
            ModuleManager.Register(new DictationModule().Create());
            ModuleManager.Register(new TextDictationModule().Create());
            ModuleManager.Register(new InterActiveDictationModule().Create());
            ModuleManager.Register(new DigitalDictationModule().Create());
            ModuleManager.Register(new ExaminationDiscussionModule().Create());
            ModuleManager.Register(new AuthenticationModule().Create());
            ModuleManager.Register(new AuditTrailModule().Create());
            ModuleManager.Register(new FailSafeModule().Create());
            ModuleManager.Register(new CancelledExaminationsModule().Create());
            ModuleManager.Register(new CustomFiltersModule().Create());
            ModuleManager.Register(new ProtocolsModule().Create());
            ModuleManager.Register(new PanelsModule().Create());
            ModuleManager.Register(new WorklistModule().Create());

            ModuleManager.Register(new LoginModule().Create());
        }

        public void RegisterConfiguredModules()
        {
            var unitySection = ConfigurationManager.GetSection("unity") as UnityConfigurationSection;
            if (unitySection != null)
                unitySection.Configure(IocContainer.Instance.Container);

            var section = WebModuleSection.Default;
            if (section == null)
            {
                return;
            }

            foreach (ModuleElement moduleElement in section.References)
            {
                try
                {
                    var type = Type.GetType(moduleElement.Type);

                    if (type == null)
                        throw new ApplicationException(string.Format("Module factory not found: {0}.\r\n\r\nPlease check the web module configuration section in the web.config.", moduleElement.Type));

                    var instance = Activator.CreateInstance(type) as IModuleFactory;

                    if (instance == null)
                    {
                        continue;
                    }

                    var moduleDefinition = instance.Create();
                    ModuleManager.Register(moduleDefinition);

                    if (moduleElement.Settings == null)
                    {
                        continue;
                    }

                    var nvc = new NameValueCollection();
                    foreach (KeyValueConfigurationElement setting in moduleElement.Settings)
                    {
                        nvc.Add(setting.Key, setting.Value);
                    }

                    ModuleManager.RegisterConfiguration(moduleDefinition.ModuleUri, nvc);
                }
                catch (Exception ex)
                {
                    throw new ApplicationException(
                        "An unexpected error occured while initializing configured web module: " +
                        moduleElement.Type, ex);
                }
            }
        }
        #endregion

        #region Unity

        public void ConfigureUnity()
        {

            var unitySection = ConfigurationManager.GetSection("unity") as UnityConfigurationSection;
            if (unitySection != null)
                unitySection.Configure(IocContainer.Instance.Container);
        }

        public void RegisterBuildInUnity()
        {
            var container = IocContainer.Instance.Container;

            container.RegisterType<ILastAccessedExaminationsProvider, LastAccessedExaminationsReportsProvider>("Reports");
            container.RegisterType<ILastAccessedExaminationsProvider, LastAccessedExaminationsSpeechStatesProvider>("SpeechStates");
            container.RegisterType<ILastAccessedExaminationsProvider, LastAccessedExaminationStatusEventsProvider>("StatusEvents");
            container.RegisterType<ILastAccessedExaminationsProvider, LastAccessedExaminationNotesProvider>("Notes");

            container.RegisterType<IMenuModuleProvider, ReceptionMenuModuleProvider>("Reception");
            container.RegisterType<IMenuModuleProvider, TechnicianMenuModuleProvider>("Technician");
            container.RegisterType<IMenuModuleProvider, RadiologistMenuModuleProvider>("Radiologist");
            container.RegisterType<IMenuModuleProvider, TranscriptionistMenuModuleProvider>("Transcriptionist");
            container.RegisterType<IMenuModuleProvider, ManagementMenuModuleProvider>("Management");
            container.RegisterType<IMenuModuleProvider, HousekeepingMenuModuleProvider>("Housekeeping");
            container.RegisterType<IMenuModuleProvider, StatisticsMenuModuleProvider>("Statistics");
            container.RegisterType<IMenuModuleProvider, ModulePageMenuProvider>("ModulePages");

            container.RegisterType<IPersonCardProvider, UserCardProvider>("User");
            container.RegisterType<IPersonCardProvider, PhysicianCardProvider>("Physician");
            container.RegisterType<IPersonCardProvider, PatientCardProvider>("Patient");

            container.RegisterType<IStoredDocumentListener, StoredDocumentListener>("StoredDocumentsListener");
        }

        public void RegisterDatabaseConnections()
        {
            var container = IocContainer.Instance.Container;

            //Register the RIS database with the default constructor
            container.RegisterType<IZillionRIS_Entities, ZillionRIS_Entities>(new InjectionConstructor());
        }

        private void RegisterFallbackUnity()
        {
            RegisterFallbackModule<IPatientNumberAssignee, BasicNumberAssignee>(null);
            RegisterFallbackModule<IOrderNumberAssignee, BasicNumberAssignee>(null);
            RegisterFallbackModule<IAccessionNumberAssignee, BasicNumberAssignee>(null);
        }

        private void RegisterFallbackModule<TI, TConcrete>(string name) where TConcrete : TI
        {
            var iocContainer = IocContainer.Instance;

            if (iocContainer.AllOf<TI>().Any() == false)
                iocContainer.Container.RegisterType<TI, TConcrete>(name);
        }
        #endregion

        #region Script Bundles.
        private void InitializeBundles()
        {
            ScriptBundleCodes = CompiledList().ToList();
        }

        private static IEnumerable<BundledItem> CompiledList()
        {
            var all =
                ModuleManager.Modules.SelectMany(x => x.Scripts, (x, y) => new {x.ModuleUri, y.Identifier})
                    .OrderBy(x => x.ModuleUri + "/" + x.Identifier)
                    .ToArray();
            var chars = (int) Math.Ceiling(all.Length/256d);

            for (var i = 0; i < all.Length; i++)
            {
                var foo = all[i];

                var bytes = new byte[chars];
                for (var j = 0; j < chars; j++)
                {
                    bytes[j] = (byte) ((i >> 8*j) & 0xff);
                }

                yield return new BundledItem
                {
                    Code = Convert.ToBase64String(bytes, Base64FormattingOptions.None).TrimEnd('='),
                    Module = foo.ModuleUri,
                    View = foo.Identifier,
                    Uri = new Uri(foo.ModuleUri, "script/" + foo.Identifier)
                };
            }
        }
        #endregion

        #region Page Information/Navigation
        public ISessionContext GetSessionContext()
        {
            try
            {
                var httpContext = Context;
                if (httpContext != null)
                    return ((httpContext.Items["SessionContext"]) ?? (httpContext.Items["SessionContext"] = CreateSessionContextCore())) as SessionContext;
            }
            catch (HttpException)
            {
                // Eat.
            }

            return CreateSessionContextCore();
        }

        private ISessionContext CreateSessionContextCore()
        {
            var webAppContext = CreateWebAppContext();

            string clientID = null, sessionID = null, requestID = null;
            string loginName = null;

            var httpContext = Context;
            if (httpContext != null)
            {
                try
                {
                    clientID = GetClientIDFromHttpContext(httpContext);
                    requestID = httpContext.Items["RequestID"] as string;
                }
                catch (Exception ex)
                {
                    const string msg = "Unable to get clientID or requestID from http context";
                    ZillionRisLog.Default.Error(string.Format(msg), ex);
                }

                try
                {
                    loginName = httpContext.GetLoginName();
                    sessionID = httpContext.GetSessionID();
                }
                catch (Exception ex)
                {
                    ZillionRisLog.Default.Error("Get RisUser from HTTP context", ex);
                }
            }

            // Make up a new session ID prefixed with N.
            if (sessionID == null) sessionID = "N" + Guid.NewGuid();

            ISessionContext sessionContext = null;
            if (loginName != null)
            {
                try
                {
                    sessionContext = webAppContext.Impersonate(loginName);
                    sessionContext.ClientID = clientID;
                    sessionContext.SessionID = sessionID;
                    sessionContext.RequestID = requestID;

                    if (RisGlobalCache.RisConfiguration != null)
                    {
                        try
                        {
                            var reportSettings = ReportContextSettings.GetOrCreate(sessionContext);
                            reportSettings.BasePath = Path.Combine(httpContext.Server.MapPath(@"~"), RisGlobalCache.RisConfiguration.riscon_ReportLocation);
                        }
                        catch (Exception ex)
                        {
                            ZillionRisLog.Default.Error("Set the base path for report files.", ex);
                        }
                    }
                }
                catch (InvalidCredentialException ex)
                {
                    // thrown by the impersonation factory.
                    ZillionRisLog.Default.Error("Creating the session context.", ex);
                }
            }
            
            if (sessionContext == null)
            {
                sessionContext = SessionContextFactory.CreateChild(webAppContext);
                sessionContext.User = null;
            }

            sessionContext.Set(httpContext);
            sessionContext.Set(CreateModuleContext());
            sessionContext.Set<IAuditTrailController>(new AuditTrailController(sessionContext.User));
            sessionContext.Set<IUserAuthorizationFactory>(IocContainer.Instance.Require<IUserAuthorizationFactory>());
            sessionContext.SetupDefaultAuditor();
            return sessionContext;
        }

        /// <summary>
        ///     Root session context authenticated using system user <see cref="WebApplicationUser"/>.
        /// </summary>
        internal ISessionContext CreateWebAppContext()
        {
            return CreateWebAppContext(DataContextFactory.CreateNew());
        }

        /// <summary>
        ///     Root session context authenticated using system user <see cref="WebApplicationUser"/>.
        /// </summary>
        internal ISessionContext CreateWebAppContext(IZillionRIS_Entities dataContext)
        {
            var sessionContext = SessionContextFactory.Create(dataContext);
            sessionContext.User = DatabaseUserSessionFactory.Instance.Open(WebApplicationUser.GetSystemUserLoginName());
            sessionContext.Logger = new ZillionRisSessionContextLogger(sessionContext);
            sessionContext.SetupDefaultAuditor();

            var disposableContainer = RequestDisposableContainer;
            if (disposableContainer != null)
                disposableContainer.Register(sessionContext.Modules.Container);

            //if (ModuleManager != null)
            //    sessionContext.Modules.Container.RegisterInstance(ModuleManager);

            return sessionContext;
        }

        public IEnumerable<MenuModule> GetModuleMenu(ISessionContext sessionContext)
        {
            return sessionContext.GetMenuModules();
        }

        public static string GetClientIDFromHttpContext(HttpContext httpContext)
        {
            //var forwardedFor = httpContext.Request.ServerVariables.GetValues("HTTP_X_FORWARDED_FOR")
            //    ?? httpContext.Request.Headers.GetValues("X-Forwarded-For");
            //var byHeader = httpContext.Request.ServerVariables["REMOTE_ADDR"];
            //var byProxy = forwardedFor != null ? forwardedFor.FirstOrDefault() : null;
            //var byIIS = httpContext.Request.UserHostAddress;

            if (httpContext == null)
                return "N/A";

            try
            {
                string clientID;

                var viaProxy = !String.IsNullOrEmpty(httpContext.Request.Headers["Via"]);
                var forwardedForAddress = GetForwardedForIP(httpContext);

                if (viaProxy == false && forwardedForAddress == null)
                {
                    // No proxy detected.
                    if (IsLoopbackClient(httpContext))
                    {
                        // Use the hostname if localhost.
                        clientID = EnvironmentCached.MachineName;
                    }
                    else
                    {
                        clientID = httpContext.Request.UserHostAddress;
                    }
                }
                else
                {
                    // Proxy detected.
                    clientID = forwardedForAddress;

                    if (!String.IsNullOrWhiteSpace(clientID))
                    {
                        return clientID;
                    }

                    // No address found for the actual client, user a client ID cookie.
                    const string cookieName = "CIDC";

                    clientID = httpContext.Items[cookieName] as string;
                    if (clientID != null)
                    {
                        return clientID;
                    }

                    var cookie = httpContext.Request.Cookies[cookieName];
                    if (cookie != null)
                        clientID = cookie.Value;

                    if (clientID == null)
                    {
                        clientID = Convert.ToBase64String(Guid.NewGuid().ToByteArray()).Trim('=');
                        cookie = new HttpCookie(cookieName, clientID);
                    }

                    cookie.Expires = DateTime.Today.AddMonths(6);
                    httpContext.Response.SetCookie(cookie);

                    httpContext.Items[cookieName] = clientID;
                }

                return clientID;
            }
            catch
            {
                return "N/A";
            }
        }

        private static bool IsLoopbackClient(HttpContext httpContext)
        {
            try
            {
                var userAddress = httpContext.Request.UserHostAddress;

                if (string.IsNullOrWhiteSpace(userAddress))
                {
                    return false;
                }

                return IPAddress.IsLoopback(IPAddress.Parse(userAddress));
            }
            catch
            {
                return false;
            }
        }

        private static string GetForwardedForIP(HttpContext httpContext)
        {
            var realClientIP = new Func<string>[]
            {
                () => httpContext.Request.Headers["X-Forwarded-For"],
                () => httpContext.Request.Headers["Forwarded-For"],
                () => httpContext.Request.Headers["Client-IP"],
                () => httpContext.Request.Headers["X-Forwarded"],
                () => httpContext.Request.Headers["Forwarded"],
                () => httpContext.Request.Headers["Forwarded-For-IP"]
            };
            var xForwarded = realClientIP.Select(x => x()).FirstOrDefault(x => String.IsNullOrWhiteSpace(x) == false);
            return xForwarded;
        }

        /// <summary>
        ///     Gets the page URL for the currently enabled ClientProfileID
        /// </summary>
        /// <param name="pageKey">The page key.</param>
        /// <returns></returns>
        /// <remarks>
        ///     <para>Created by tdgroen at 2011-05-10.</para>
        /// </remarks>
        public string GetPageUrl(string pageKey)
        {
            foreach (var pageAccessInformation in GetModuleMenu(GetSessionContext()).SelectMany(m => m.Pages))
            {
                if (pageAccessInformation.Key == pageKey)
                    return pageAccessInformation.Url;
            }

            return null;
        }

        /// <summary>
        ///     Navigates to the specified page.
        /// </summary>
        /// <param name="pageKey">The page key.</param>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-11-22.</para>
        /// </remarks>
        public void NavigatePage(string pageKey)
        {
            var pageUrl = GetPageUrl(pageKey);
            Redirect(pageUrl, true);

            var message = String.Format("The specified page key \"{0}\" could not be found in the user's pages.",
                pageKey);
            throw new ArgumentException(message, "pageKey");
        }

        #region JavaScript Language
        
        public static List<BundledItem> ScriptBundleCodes;
        private readonly IBundledScriptProvider _codeProvider = new Test();

        private class Test : IBundledScriptProvider
        {
            public BundledItem ResolveNext(ref string code)
            {
                foreach (var scriptBundleCode in ScriptBundleCodes)
                {
                    var startsWith = code.StartsWith(scriptBundleCode.Code, false, CultureInfo.InvariantCulture);
                    if (!startsWith)
                    {
                        continue;
                    }
                    code = code.Substring(scriptBundleCode.Code.Length);
                    return scriptBundleCode;
                }
                return null;
            }
        }

        public string ETagCacheID
        {
            get
            {
                var sessionContext = GetSessionContext();

                return sessionContext == null ? Base62.NewBase62().ToString() : sessionContext.SessionID;
            }
        }
        #endregion

        #endregion

        #region Methods
        /// <summary>
        ///     Determines whether the current RIS user has the specified permission.
        /// </summary>
        /// <param name="permission">The permission.</param>
        /// <returns>
        ///     Returns <c>true</c> when the permission has been granted; otherwise <c>false</c>.
        /// </returns>
        /// <seealso cref="UserPermissions" />
        public bool UserHasPermission(params string[] permission)
        {
            if (GetSessionContext().User == null)
                return false;

            Precondition.ArgumentNotNullOrEmpty("permission", permission);
            UserPermissions.ValidatePermission(permission);

            return GetSessionContext().HasPermissionAll(permission);
        }
        
        /// <summary>
        ///     Initializes the specified user.
        /// </summary>
        /// <param name="loginName">Name of the login.</param>
        /// <param name="locationID">ID of the location to log in to.</param>
        /// <returns>
        ///     Returns <c>true</c> when succeeded; otherwise <c>false</c>.
        /// </returns>
        /// <exception cref="InvalidOperationException">
        ///     Thrown when a user has already been initialized.
        /// </exception>
        public bool InitializeUser(string loginName, int locationID)
        {
            #region Preconditions.
            Precondition.ArgumentNotNullOrEmpty("loginName", loginName);

            if (GetSessionContext().User != null)
            {
                throw new InvalidOperationException(
                    String.Format(WebResources.RisApplication_UserAlreadyInitialized,
                        loginName,
                        GetSessionContext().User.LoginName));
            }
            #endregion

            var webAppContext = CreateWebAppContext();
            try
            {
                var userSession = webAppContext.Impersonate(loginName);
                if (userSession.User == null)
                {
                    // User could not be loaded.
                    LogError(String.Format("User ({0}) failed to be initialized.", loginName));
                    return false;
                }

                if (userSession.ChangeLocationID(locationID) == false)
                {
                    // User could not be logged into the location.
                    LogError(String.Format("User ({0}) could not login to {1}.", loginName, locationID));
                    return false;
                }

                // Check whether the user is still active.
                if (userSession.GetAuthorization().IsActive() == false)
                {
                    LogError(String.Format("User ({0}) failed to be initialized, because it is inactive.", loginName));
                    return false;
                }

                // User successfully loaded.
                LogAction(ZillionRisLogLevel.Notice, String.Format("User ({0}) successfully initialized.", loginName));

                Context.UpdateSessionUserToken(loginName);

                // Attempt to load the default printer settings.
                try
                {
                    Context.Items.Remove("SessionContext");
                    LoadDefaultPrinter(GetSessionContext());
                }
                catch (Exception ex)
                {
                    LogAction(ZillionRisLogLevel.Warning,
                        String.Format("Unable to load the user's default printer settings. {0}", ex));
                }
                return true;
            }
            finally
            {
                webAppContext.DisposeAll();
            }
        }

        public void LoadDefaultPrinter(ISessionContext sessionContext)
        {
            if (sessionContext == null)
                throw new ArgumentNullException("sessionContext", "No session context.");
            if (sessionContext.User == null)
                throw new ArgumentException("User not logged in.", "sessionContext");

            var userID = sessionContext.User.UserID;

            //
            // Load the user's printer preferences.
            var userSummary = sessionContext.DataContext
                .RISUsers
                .Where(u => u.risuse_UserID == userID)
                .Select(u => new {u.DefaultPrinter.Location.loc_LocationID, u.DefaultPrinter.pri_PrinterID})
                .FirstOrDefault();

            if (userSummary == null)
                throw new InvalidOperationException("Unable to find user printer settings.");

            var settings = sessionContext.PrinterSettings();

            var isLetterOnLocation = GetPrinterLocationID(sessionContext, settings.LetterPrinterID) == sessionContext.GetActiveLocationID();
            if (isLetterOnLocation == false)
            {
                if (sessionContext.GetActiveLocationID() == userSummary.loc_LocationID)
                {
                    // Assign the user's default printer.
                    settings.LetterPrinterID = userSummary.pri_PrinterID;
                }
                else
                {
                    // We don't know which printer the user needs.
                    settings.LetterPrinterID = 0;
                }
            }

            var isLabelOnLocation = GetPrinterLocationID(sessionContext, settings.LabelPrinterID) == sessionContext.GetActiveLocationID();
            if (isLabelOnLocation == false)
            {
                // We don't know which printer the user needs.
                settings.LabelPrinterID = 0;
            }

            settings.SaveTo(sessionContext);
        }

        private static int GetPrinterLocationID(ISessionContext sessionContext, int printerID)
        {
            return sessionContext.DataContext.Printers.Where(x => x.pri_PrinterID == printerID).Select(x => x.Location.loc_LocationID).FirstOrDefault();
        }

        /// <summary>
        ///     Loads the business rules.
        /// </summary>
        /// <remarks>
        ///     <para>Created by tdgroen on 2011-02-04.</para>
        /// </remarks>
        public void LoadBusinessRules()
        {
            if (RisAppSettings.AppSetting_EnableLateralityBoth == false)
            {
                if (RisAppSettings.AppSetting_UseUnknownLaterality)
                {
                    ExaminationTypeViewModel.DefaultLateralities = new[]
                    {
                        new LateralityViewModel('L', "L"),
                        new LateralityViewModel('R', "R"),
                        new LateralityViewModel('O', "O")
                    };
                }
                else
                {
                    ExaminationTypeViewModel.DefaultLateralities = new[]
                    {
                        new LateralityViewModel('L', "L"),
                        new LateralityViewModel('R', "R")
                    };
                }
            }
            else
            {
                if (RisAppSettings.AppSetting_UseUnknownLaterality)
                {
                    ExaminationTypeViewModel.DefaultLateralities = new[]
                    {
                        new LateralityViewModel('L', "L"),
                        new LateralityViewModel('R', "R"),
                        new LateralityViewModel('O', "O"),
                        new LateralityViewModel('B', "B")
                    };
                }
                else
                {
                    ExaminationTypeViewModel.DefaultLateralities = new[]
                    {
                        new LateralityViewModel('L', "L"),
                        new LateralityViewModel('R', "R"),
                        new LateralityViewModel('B', "B")
                    };
                }
            }

            try
            {
                var processRepository = new ProcessRepository();
                processRepository.EnsureDatabase();
            }
            catch (Exception ex)
            {
                if (InitializationExceptions == null)
                    InitializationExceptions.Add(
                        new ApplicationException(
                            string.Format("Unable to verify the connection with the workflow database: {0}", ex.Message),
                            ex));
            }
        }

        /// <summary>
        ///     Log info for the current logged on user.
        /// </summary>
        /// <param name="logLevel">The log level.</param>
        /// <param name="action">The action.</param>
        public void LogAction(ZillionRisLogLevel logLevel, string action)
        {
            var sessionContext = GetSessionContext();
            var loginName = sessionContext.User == null ? "(not logged on)" : sessionContext.User.LoginName;

            ZillionRisLog.Default.Write(logLevel, String.Format("User: {0} Action: {1}", loginName, action));
        }

        /// <summary>
        ///     Log info for the current logged on user.
        /// </summary>
        /// <param name="action">The action.</param>
        /// <param name="exception">The exception.</param>
        public void LogError(string action, Exception exception = null)
        {
            string loginName;
            try
            {
                var sessionContext = GetSessionContext();
                loginName = sessionContext.User == null ? "(not logged on)" : sessionContext.User.LoginName;

            }
            catch
            {
                loginName = "Unknown";
            }

            ZillionRisLog.Default.Error(String.Format("User: {0} Action: {1}", loginName, action), exception);
        }

        /// <summary>
        ///     Logs off the current user.
        /// </summary>
        public void LogoffUser(string reason = null)
        {
            var loginName = Context.GetLoginName();
            if (loginName != null)
                LogAction(ZillionRisLogLevel.Notice, String.Format("User ({0}) logging off.", loginName));

            // Clear user information.
            Rogan.ZillionRis.Web.HttpContextExtensions.Clear(HttpContext.Current);

            var reasonQuery = string.IsNullOrEmpty(reason) ? null : "reason=" + HttpUtility.UrlEncode(reason);
            if (reasonQuery != null)
                HttpContext.Current.Response.Redirect("~/Login.aspx?" + reasonQuery, true);
            else
                HttpContext.Current.Response.Redirect(Rogan.ZillionRis.Login.Settings.LogoffUrl ?? "~/Login.aspx", true);
        }

        /// <summary>
        ///     Redirects to the specified URL during a request/postback/callback.
        /// </summary>
        /// <param name="url">The target URL.</param>
        /// <param name="endResponse">
        ///     if set to <c>true</c> <see cref="HttpResponse.End" /> will be called when the current request is not a callback.
        /// </param>
        /// <remarks>
        ///     <para>Created by tdgroen on 2011-01-24.</para>
        /// </remarks>
        public void Redirect(string url,
            bool endResponse)
        {
            if (Context == null || Response == null)
                throw new InvalidOperationException("Unable to retrieve the HTTP context or response instance.");

            Response.Redirect(url, endResponse);
        }
        #endregion

        public IEnumerable<CultureInfo> GetAvailableCultures()
        {
            var cultures = new List<CultureInfo>();
            cultures.Add(CultureInfo.CreateSpecificCulture("en-US"));

            var appPath = HttpContext.Current.Request.ApplicationPath;
            var physicalPath = HttpContext.Current.Request.MapPath(appPath);
            var executablePath = physicalPath;
            var directories = new DirectoryInfo(Path.Combine(executablePath, "bin"));
            foreach (var s in directories.EnumerateDirectories())
            {
                var culture = CultureHelper.GetCultureInfo(s.Name);

                if (culture != null)
                {
                    cultures.Add(culture);
                }
            }

            return KeepMostSpecificCultures(cultures);
        }

        /// <summary>
        ///     Removes neutral cultures for which specific cultures are found.
        /// </summary>
        /// <param name="cultures">The cultures.</param>
        /// <returns>IEnumerable{CultureInfo}.</returns>
        private static IEnumerable<CultureInfo> KeepMostSpecificCultures(IEnumerable<CultureInfo> cultures)
        {
            return cultures
                .Where(e => e.IsNeutralCulture == false || cultures.All(d => Equals(d.Parent, e) == false))
                .Distinct();
        }

        public List<object> BroadcastIntent(Intent intent)
        {
            return (Context.GetModuleContext() ?? CreateModuleContext()).BroadcastIntent(intent);
        }

        private ModuleContext CreateModuleContext()
        {
            var moduleManager = ModuleManager;

            var webApplicationAspect = new WebApplicationTaskAspect();

            var moduleContext = new ModuleContext(moduleManager);
            moduleContext.ScriptActivator.ScriptAspects.Add(webApplicationAspect);
            moduleContext.ViewActivator.ViewAspects.Add(webApplicationAspect);
            moduleContext.TaskActivator.TaskAspects.Add(webApplicationAspect);
            moduleContext.ContentActivator.ContentAspects.Add(webApplicationAspect);
            return moduleContext;
        }

        #region Module Pages
        private static void RegisterModulePages()
        {
            // URLs for module pages: ~/p/{page}
            var item = new ModulePageRouteHandler();
            item.VirtualBasePath = "~/p/";
            RouteTable.Routes.Add(new Route("p/{page}", item));

            var intent = new Intent
            {
                Action = WebControlsIntent.Action_ModulePage,
                Component = null,
                Data = null
            };

            var activator = new TaskActivator();
            activator.Manager = ModuleManager;

            var resolvedIntents = ModuleManager.Intent(intent);
            foreach (var resolvedIntent in resolvedIntents)
            {
                var task = activator.Task(ActivatingRequest.Create(resolvedIntent)) as ModulePageDefinition;
                if (task != null)
                {
                    item.ComponentMap[task.Name] = resolvedIntent.Component;
                }
            }
        }
        #endregion

        public void ClearETagCacheID()
        {
            // TODO
        }
    }
}
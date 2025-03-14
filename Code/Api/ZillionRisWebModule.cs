using System;

using Rogan.ZillionRis.Technician;
using Rogan.ZillionRis.Web.Reflection;
using Rogan.ZillionRis.Web.Shared;
using Rogan.ZillionRis.Web.Shared.Defintions;
using Rogan.ZillionRis.Website.Code.Api.Data;
using Rogan.ZillionRis.Website.Code.Api.Tasks;

namespace Rogan.ZillionRis.Website.Code.Api
{
    public sealed class ZillionRisWebModule : IModuleFactory
    {
        public ModuleDefinition Create()
        {
            var builder = new ModuleBuilder()
                .SetModuleUri(new Uri("module://websitecore/"));

            builder
                .AddContentProvider<AdvancedFilterPageService>("advancedfilter")
                .AddContentProvider<DiscussionListPageService>("discussion")
                .AddContentProvider<ExaminationProtocolAssignmentsService>("examinationprotocolassignments")
                //.AddContentProvider<PatientSearchService>("patient")
                .AddContentProvider<FunctionSpecialisationService>("specialisation")
                .AddContentProvider<LocationService>("location")
                .AddContentProvider<StatisticsPageService>("statistics")
                .AddContentProvider<AdvancedPatientSearchPageService>("advancedpatientsearch")
                .AddContentProvider<PhysiciansResourceService>("physicians")
                .AddContentProvider<UsersResource>("users")
                .AddContentProvider<UrgencyService>("urgencies");

            builder
                .AddTask<HousekeepingService>("housekeeping")
                .AddTask<IntermediateService>("intermediate")
                .AddView("intermediate-view", typeof(ZillionRisWebModule), "Views.IntermediateView.cshtml")
                .AddTask<TimeSynchronizationService>("time")
                .AddTask<VersionInfoTask>("versioninfo");

            return builder.Build();
        }
    }
}

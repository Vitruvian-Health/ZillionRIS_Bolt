using System;

using Rogan.ZillionRis.Web.Reflection;
using Rogan.ZillionRis.Web.Shared.Defintions;

namespace Rogan.ZillionRis.Website.Code.Legacy
{
    public class LegacyModuleBuilder
    {
        public ModuleDefinition CreateModule()
        {
            var builder = new ModuleBuilder().SetModuleUri(new Uri("module://legacy/"));

            builder.AddTask<EngineStartTask>("engine-startup-task");
            builder.AddTask<PrintPatientLabelTask>("print-patientlabel");
            builder.AddTask<PrintAppointmentLetterTask>("print-appointmentletter");
            builder.AddTask<PrintDnaLetterTask>("print-dnaletters");

            builder.AddTask<WebAppHealthCheck>("health-check");
            builder.AddTask<DatabaseHealthCheck>("database-health-check");

            return builder.Build();
        }
    }
}

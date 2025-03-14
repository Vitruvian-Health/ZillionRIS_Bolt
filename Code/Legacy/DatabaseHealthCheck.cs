using System;
using System.Linq;
using System.Reflection;
using DelftDI.Common.RIS.Common;
using Rogan.ZillionRis.Codes.ExaminationStatus;
using Rogan.ZillionRis.EntityData;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.Web;
using Rogan.ZillionRis.Web.Health;
using Rogan.ZillionRis.Web.Reflection;

namespace Rogan.ZillionRis.Website.Code.Legacy
{
    public class DatabaseHealthCheck : ZillionRisBaseTask
    {

        private void CheckRISDBVersion()
        {
            DBVersionNumber dbVersion;
            RISDBVersion versionEntry = null;

            using (var zillionRisEntities = new ZillionRIS_Entities())
            {
                try
                {
                    versionEntry = zillionRisEntities
                        .ExecuteStoreQuery<RISDBVersion>("SELECT [Version] FROM [Rogan].[DatabaseVersion]")
                        .FirstOrDefault();
                }
                catch (Exception ex)
                {
                    throw new ModuleStatusException(
                        ModuleStatusScore.Invalid,
                        "Unable to query the RIS DatabaseVersion table: " + ex.Message,
                        ex);
                }

            }

            if (versionEntry == null)
            {
                throw new ModuleStatusException(ModuleStatusScore.Invalid, "No RIS DatabaseVersion entry found.");
            }

            var versionText = versionEntry.Version;
            if (DBVersionNumber.TryParse(versionText, out dbVersion) == false)
                throw new ModuleStatusException(ModuleStatusScore.Invalid,
                    string.Format("Unrecognized version format: {0}", versionText));

           var applicationVersion = DBVersionNumber.Parse(Assembly.GetExecutingAssembly().GetName().Version.ToString());

            if (dbVersion.CompareTo(applicationVersion) < 0)
                throw new ModuleStatusException(ModuleStatusScore.Invalid,
                    string.Format("Database version is too low: {0}.", dbVersion));

            if (dbVersion.CompareTo(applicationVersion) > 0)
                throw new ModuleStatusException(ModuleStatusScore.Inconclusive,
                    string.Format("Database version is higher than expected: {0}.",dbVersion));

            //All Ok...
            throw new ModuleStatusException(ModuleStatusScore.Valid,
                string.Format("Version found: {0}", dbVersion));
        }

        internal class RISDBVersion
        {
            public string Version { get; set; }
        }

        [TaskAction(WorkflowIntent.Action_HealthCheck)]
        [TaskActionIntent(WorkflowIntent.Action_HealthCheck)]
        public ModuleStatusCollection Status()
        {
            var list = new ModuleStatusCollection();

            list.Add("Zillion RIS Database Schema Version", "Validates the version in the RIS Database Version.", null,
                CheckRISDBVersion);
            list.Add("Zillion RIS Permissions", "Validates that all permissions are in the database.", null,
                CheckPermissions);
            list.Add("Zillion RIS Examination Statuses", "Validates that all examination statuses are in the database.",
                null, CheckExaminationStatuses);

            return list;
        }

        private void CheckExaminationStatuses()
        {
            // All codes except invalid (not in the database).
            var statusesCode = ExaminationStatusValue.All.Where(x => x != ExaminationStatusValue.Invalid);

            using (var zillionRisEntities = new ZillionRIS_Entities())
            {
                var statusesDatabase = zillionRisEntities.ExaminationStatuses.Select(x => x.exasta_StatusID).ToArray();

                var missingStatuses = statusesCode.Except(statusesDatabase);

                if (!missingStatuses.Any())
                {
                    return;
                }

                var text = missingStatuses.Select(
                    x => string.Format("{0} ({1})", ExaminationStatusValueExtensions.ToString(x), x));

                throw new ModuleStatusException(
                    ModuleStatusScore.Invalid,
                    string.Format("Missing examination statuses: {0}.", text.JoinText(", ")));
            }
        }

        private void CheckPermissions()
        {
            var permissionsCode = typeof (UserPermissions)
                .GetProperties(BindingFlags.Public | BindingFlags.Static)
                .Where(x => x.PropertyType == typeof (string) && x.CanWrite == false)
                .Select(x => (string) x.GetValue(null, null))
                .ToArray();

            using (var zillionRisEntities = new ZillionRIS_Entities())
            {
                var permissionsDatabase = zillionRisEntities.RISPermissions.Select(x => x.risper_RISPermissionName).ToArray();

                var missingPermissions = permissionsCode.Except(permissionsDatabase);

                if (missingPermissions.Any())
                {
                    throw new ModuleStatusException(
                        ModuleStatusScore.Invalid,
                        string.Format("Missing permissions: {0}.", missingPermissions.JoinText(", ")));
                }
            }
        }

    }
}
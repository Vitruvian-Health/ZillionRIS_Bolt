using System;
using Newtonsoft.Json;

using Rogan.ZillionRis.Business;
using Rogan.ZillionRis.EntityData;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.Housekeeping;
using Rogan.ZillionRis.Security;
using Rogan.ZillionRis.Web.Reflection;

namespace Rogan.ZillionRis.Website.Code.Api.Tasks
{
    public sealed class HousekeepingService : ZillionRisBaseTask 
    {
        [TaskAction("add")]
        public bool AddToHousekeeping(AddRequest request)
        {
            if (!Context.HasPermission(UserPermissions.SendToHousekeeping))
            {
                throw new Exception(String.Format("User {0} does not have permission to send to Housekeeping.", Context.User.LoginName));
            }

            using (var controller = new HousekeepingController())
            {
                controller.AddExaminationToHousekeeping(request.ExaminationID, this.Context.User.UserID, request.Memo);
                return true;
            }
        }

        [TaskAction("remove")]
        public bool RemoveFromHousekeeping(RemoveRequest request)
        {
            if (!Context.HasPermission(UserPermissions.SendToHousekeeping))
            {
                throw new Exception(String.Format("User {0} does not have permission to remove from Housekeeping.", Context.User.LoginName));
            }

            using (var controller = new HousekeepingController())
            {
                var examination = Context.DataContext.QueryExamination(request.ExaminationID);
                var examinationStatus = examination.Status;
                controller.RemoveExaminationFromHousekeeping(request.HousekeepingID, this.Context.User.UserID);
                ChangeExaminationStatusController.Concerns.AddExaminationStatusEvent(this.Context.DataContext, examination, examinationStatus, this.Context.User.UserID);
                return true;
            }
        }

        #region Nested type: AddRequest
        public sealed class AddRequest
        {
            [JsonProperty("examinationID")]
            public int ExaminationID { get; set; }

            [JsonProperty("memo")]
            public string Memo { get; set; }
        }
        #endregion

        #region Nested type: RemoveRequest
        public sealed class RemoveRequest
        {
            [JsonProperty("examinationID")]
            public int ExaminationID { get; set; }

            [JsonProperty("housekeepingID")]
            public int HousekeepingID { get; set; }
        }
        #endregion
    }
}

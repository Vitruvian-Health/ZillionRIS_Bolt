using Rogan.ZillionRis;
using Rogan.ZillionRis.EntityData;
using Rogan.ZillionRis.Extensibility.Audit;
using Rogan.ZillionRis.ViewModels;
using System;
using System.Collections.Generic;
using System.Linq;
using DelftDI.Common.RIS.Common;
using Rogan.ZillionRis.Codes.ExaminationStatus;

namespace ZillionRis
{
    /// <summary>
    /// This class identifies changes for the EditOrder operation.
    /// 
    /// This audit type creates a single audit message containing the changes made to
    /// the order and all of the examinations on the order.
    /// </summary>
    public class EditOrderChangeResolver : IChangeResolver
    {
        public Dictionary<string, object> CalculateDeltas(object oldObject, object newObject)
        {
            return CalculateDeltas((OrderSnapshot) oldObject, (OrderSnapshot) newObject);
        }

        private Dictionary<string, object> CalculateDeltas(OrderSnapshot oldOrder, OrderSnapshot newOrder)
        {
            var changes = HandleOrder(oldOrder, newOrder);

            // Handle the examinations contained in the order then add them to the 
            // changeset created by HandleOrder.

            var examChanges = new List<object>();

            // Edited & Deleted examinations
            foreach (var oldExam in oldOrder.Examinations)
            {
                ExaminationSnapshot newExam;
                if (!newOrder.Examinations.TryGetValue(oldExam.Key, out newExam))
                {
                    newExam = new ExaminationSnapshot(null);
                }

                var examChange = HandleExamination(oldExam.Value, newExam);

                if (examChange != null)
                {
                    examChanges.Add(examChange);
                }
            }

            var oldExamIDs = oldOrder.Examinations.Keys.ToList();

            // New examinations
            foreach (var newExam in newOrder.Examinations.Where(_ => !oldExamIDs.Contains(_.Key)))
            {
                var oldExam = new ExaminationSnapshot(null);
                var examChange = HandleExamination(oldExam, newExam.Value);

                if (examChange != null)
                {
                    examChanges.Add(examChange);
                }
            }

            if (!examChanges.IsNullOrEmpty())
            {
                changes.Add("Examinations", examChanges);
            }
            return changes;
        }

        private Dictionary<string, object> HandleOrder(OrderSnapshot oldOrderSnapshot, OrderSnapshot newOrderSnapshot)
        {
            // The comparison logic here was extracted from the EditOrder.aspx code-behind
            // and extended to use use a ChangeTracker to collect the changes.

            // This method handles all properties of EditOrderModel.
            //
            // The following properties are readonly at time of writing:
            //      public string Memo { get; set; } [display only]
            //      public string MedicalIndication { get; set; } [display only]
            //      public string WardValue { get; set; }
            //      public DateTime ImportOrderDate { get; set; }
            //      public bool RetrospectiveBooking { get; set; }
            //      public int? PatientGPPhysicianID { get; set; }
            var tracker = new ChangeTracker();

            //
            // Simple fields: compare then track

            //public DateTimeOffset? DateOfRequest { get; set; }
            if (oldOrderSnapshot.RequestDate != newOrderSnapshot.RequestDate)
                tracker.Add("RequestDate", oldOrderSnapshot.RequestDate, newOrderSnapshot.RequestDate);

            //public DateTimeOffset? RetrievalDate { get; set; }
            if (oldOrderSnapshot.RetrievalDate != newOrderSnapshot.RetrievalDate)
                tracker.Add("RetrievalDate", oldOrderSnapshot.RetrievalDate, newOrderSnapshot.RetrievalDate);

            //public string UrgencyID { get; set; }
            if (oldOrderSnapshot.UrgencyID != newOrderSnapshot.UrgencyID)
                tracker.Add("Urgency", oldOrderSnapshot.UrgencyName, newOrderSnapshot.UrgencyName);

            //public string AddMemo { get; set; } (new Memo)
            if (!string.IsNullOrWhiteSpace(newOrderSnapshot.AddMemo))
                tracker.Add("OrderMemo", null, newOrderSnapshot.AddMemo);

            //public string AddMedicalIndication { get; set; } (new Memo)
            if (!string.IsNullOrWhiteSpace(newOrderSnapshot.AddMedicalIndication))
                tracker.Add("MedicalIndication", null, newOrderSnapshot.AddMedicalIndication);

            //
            // Simple References: compare, lookup values then track

            //public int? ReferralTypeID { get; set; }
            if (oldOrderSnapshot.ReferralTypeID != newOrderSnapshot.ReferralTypeID)
            {
                tracker.Add("ReferralType", oldOrderSnapshot.ReferralTypeName, newOrderSnapshot.ReferralTypeName);
            }

            //public int? PhysicianID { get; set; }
            if (oldOrderSnapshot.RequestingPhysicianID != newOrderSnapshot.RequestingPhysicianID)
            {
                tracker.Add("RequestingPhysician", oldOrderSnapshot.RequestingPhysicianName,
                    newOrderSnapshot.RequestingPhysicianName);
            }

            //public int? OrderTypeID { get; set; }
            if (oldOrderSnapshot.OrderTypeID != newOrderSnapshot.OrderTypeID)
            {
                tracker.Add("OrderType", oldOrderSnapshot.OrderTypeName, newOrderSnapshot.OrderTypeName);
            }

            //public int? RequestingLocationID { get; set; }
            if (oldOrderSnapshot.RequesterLocationID != newOrderSnapshot.RequesterLocationID)
            {
                tracker.Add("RequesterLocation", oldOrderSnapshot.RequesterLocationDescription,
                    newOrderSnapshot.RequesterLocationDescription);
            }

            //public int? RequestingWorkLocationID { get; set; }
            if (oldOrderSnapshot.RequestingWorkLocationID != newOrderSnapshot.RequestingWorkLocationID)
            {
                tracker.Add("RequestingWorkLocation", oldOrderSnapshot.RequestingWorkLocationDescription,
                    newOrderSnapshot.RequestingWorkLocationDescription);
            }

            //public int? PatientCategoryID { get; set; }
            if (oldOrderSnapshot.PatientCategoryID != newOrderSnapshot.PatientCategoryID)
            {
                tracker.Add("PatientCategory", oldOrderSnapshot.PatientCategoryName,
                    newOrderSnapshot.PatientCategoryName);
            }

            //public int? CopyToPhysicianID { get; set; }
            if (oldOrderSnapshot.CopyToPhysicianID != newOrderSnapshot.CopyToPhysicianID)
            {
                tracker.Add("CopyToPhysician", oldOrderSnapshot.CopyToPhysicianName,
                    newOrderSnapshot.CopyToPhysicianName);
            }

            //public int? CopyToWorkLocationID { get; set; }
            if (oldOrderSnapshot.CopyToWorkLocationID != newOrderSnapshot.CopyToWorkLocationID)
            {
                tracker.Add("CopyToWorkLocation", oldOrderSnapshot.CopyToWorkLocationDescription,
                    newOrderSnapshot.CopyToWorkLocationDescription);
            }

            //public int? CopyToRequesterLocationID { get; set; }
            if (oldOrderSnapshot.CopyToRequesterLocationID != newOrderSnapshot.CopyToRequesterLocationID)
            {
                tracker.Add("CopyToRequesterLocation", oldOrderSnapshot.CopyToRequesterLocationDescription,
                    newOrderSnapshot.CopyToRequesterLocationDescription);
            }
            
            return tracker.Finish();
        }

        private Dictionary<string, object> HandleExamination(ExaminationSnapshot oldExam, ExaminationSnapshot newExam)
        {
            var tracker = new ChangeTracker();

            if (oldExam.AccessionNumber != newExam.AccessionNumber)
            {
                tracker.Add("AccessionNumber", oldExam.AccessionNumber, newExam.AccessionNumber);
            }
            else
            {
                tracker.AddMetadata("AccessionNumber", newExam.AccessionNumber);
            }

            if (oldExam.ExaminationTypeID != newExam.ExaminationTypeID || oldExam.Laterality != newExam.Laterality)
            {
                tracker.Add("ExaminationType", oldExam.ExaminationType, newExam.ExaminationType);
            }
            else
            {
                tracker.AddMetadata("ExaminationType", newExam.ExaminationType);
            }

            if (oldExam.OverrideBilling != newExam.OverrideBilling)
            {
                tracker.Add("OverrideBilling", oldExam.OverrideBilling, newExam.OverrideBilling);
            }

            if (oldExam.StatusID != newExam.StatusID)
            {
                tracker.Add("ExaminationStatus", oldExam.StatusID, newExam.StatusID);
            }

            if (oldExam.CancellationReasonID != newExam.CancellationReasonID)
            {
                tracker.Add("CancellationReason", oldExam.CancellationReasonText, newExam.CancellationReasonText);
            }

            if (oldExam.CancellationDetails != newExam.CancellationDetails)
            {
                tracker.Add("CancellationDetails", oldExam.CancellationDetails, newExam.CancellationDetails);
            }

            if (!tracker.HasChanges)
            {
                // Remove examination               
                return null;
            }

            return tracker.Finish();
        }

        /// <summary>
        /// Represents a snapshot of an order at a certain point in time.
        /// This can then be compare to a snapshot of that same order at another point in time to determine the changes made to that order.
        /// </summary>
        internal class OrderSnapshot
        {
            internal DateTimeOffset? RequestDate { get; }
            internal DateTimeOffset? RetrievalDate { get; }
            internal string UrgencyID { get; }
            internal string UrgencyName { get; }
            internal string AddMemo { get; }
            internal string AddMedicalIndication { get; }
            internal int? ReferralTypeID { get; }
            internal string ReferralTypeName { get; }
            internal int? RequestingPhysicianID { get; }
            internal string RequestingPhysicianName { get; }
            internal int? OrderTypeID { get; }
            internal string OrderTypeName { get; }
            internal int? RequesterLocationID { get; }
            internal string RequesterLocationDescription { get; }
            internal int? RequestingWorkLocationID { get; }
            internal string RequestingWorkLocationDescription { get; }
            internal int? PatientCategoryID { get; }
            internal string PatientCategoryName { get; }

            internal int? CopyToPhysicianID { get; }
            internal string CopyToPhysicianName { get; }
            internal int? CopyToWorkLocationID { get; }
            internal string CopyToWorkLocationDescription { get; }
            internal int? CopyToRequesterLocationID { get; }
            internal string CopyToRequesterLocationDescription { get; }

            internal Dictionary<int, ExaminationSnapshot> Examinations { get; }

            /// <summary>
            /// Create a snapshot of an order.
            /// </summary>
            /// <param name="dataContext">data context</para>
            /// <param name="orderID">the order ID</param>
            internal OrderSnapshot(IZillionRIS_Entities dataContext, int orderID)
            {
                var order = dataContext.Orders.First(_ => _.ord_OrderID == orderID);

                RequestDate = order.ord_RequestDate;
                RetrievalDate = order.ord_RetrievalDate;
                UrgencyID = order.Urgency.urg_UrgencyID;
                UrgencyName = order.Urgency.urg_UrgencyName;

                AddMemo = null;
                AddMedicalIndication = null;

                ReferralTypeID = order.ReferralType?.reftyp_ReferralTypeID;
                ReferralTypeName = order.ReferralType?.reftyp_ReferralTypeName;

                RequestingPhysicianID = order.RequestingPhysician?.phy_PhysicianID;
                RequestingPhysicianName = order.RequestingPhysician?.Person.per_DisplayName;

                OrderTypeID = order.OrderType?.ordtyp_OrderTypeID;
                OrderTypeName = order.OrderType?.ordtyp_OrderTypeName;

                RequesterLocationID = order.RequesterLocation?.reqloc_RequesterLocationID;
                RequesterLocationDescription = order.RequesterLocation?.reqloc_Description;

                RequestingWorkLocationID = order.RequestingWorkLocation?.worloc_WorkLocationID;
                RequestingWorkLocationDescription = order.RequestingWorkLocation?.Practice.pra_Description;

                PatientCategoryID = order.PatientCategory?.patcat_PatientCategoryID;
                PatientCategoryName = order.PatientCategory?.patcat_PatientCategoryName;

                var copyToPhysicianInfo
                    = dataContext.Orders
                        .Where(x => x.ord_OrderID == orderID)
                        .SelectMany(x => x.OrderPhysicianReportCopies)
                        .Select(x => new
                        {
                            x.Physician.phy_PhysicianID,
                            x.Physician.Person.per_DisplayName,
                            WorkLocationID = x.WorkLocation == null ? null : (int?)x.WorkLocation.worloc_WorkLocationID,
                            WorkLocationDescription = x.WorkLocation == null ? null : x.WorkLocation.Practice.pra_Description,
                            RequesterLocationID = x.RequesterLocation == null ? null : (int?)x.RequesterLocation.reqloc_RequesterLocationID,
                            RequesterLocationDescription = x.RequesterLocation == null ? null : x.RequesterLocation.reqloc_Description
                        })
                        .FirstOrDefault();

                CopyToPhysicianID = copyToPhysicianInfo?.phy_PhysicianID;
                CopyToPhysicianName = copyToPhysicianInfo?.per_DisplayName;
                CopyToWorkLocationID = copyToPhysicianInfo?.WorkLocationID;
                CopyToWorkLocationDescription = copyToPhysicianInfo?.WorkLocationDescription;
                CopyToRequesterLocationID = copyToPhysicianInfo?.RequesterLocationID;
                CopyToRequesterLocationDescription = copyToPhysicianInfo?.RequesterLocationDescription;

                Examinations = order.Examinations.ToDictionary(_ => _.exa_ExaminationID, _ => new ExaminationSnapshot(_));
            }

            /// <summary>
            /// Create a snapshot of an EditOrderModel.
            /// </summary>
            /// <param name="database">database to retrieve additional info (e.g. accession numbers, names, descriptions) from</param>
            /// <param name="order">order model</param>
            /// <param name="examinations">models of examination belonging to order</param>
            /// <param name="cancellationReasons">mapping from examination id to cancelation reason</param>
            /// <param name="cancellationDetails">mapping from examination id to cancelation details</param>
            public OrderSnapshot(IZillionRIS_Entities database, EditOrderModel order,
                IEnumerable<ExaminationViewModel> examinations,
                Dictionary<int, int> cancellationReasons, Dictionary<int, string> cancellationDetails)
            {
                if (order == null)
                {
                    Examinations = new Dictionary<int, ExaminationSnapshot>();
                    return;
                }

                RequestDate = order.DateOfRequest;
                RetrievalDate = order.RetrievalDate;
                UrgencyID = order.UrgencyID;
                UrgencyName = database.Urgencies.First(urg => urg.urg_UrgencyID == order.UrgencyID).urg_UrgencyName;

                AddMemo = order.AddMemo;
                AddMedicalIndication = order.AddMedicalIndication;

                ReferralTypeID = order.ReferralTypeID;
                ReferralTypeName
                    = !order.ReferralTypeID.HasValue
                        ? null
                        : database.ReferralTypes.First(
                            reqPhy => reqPhy.reftyp_ReferralTypeID == order.ReferralTypeID.Value)
                            .reftyp_ReferralTypeName;

                RequestingPhysicianID = order.PhysicianID;
                RequestingPhysicianName
                    = !order.PhysicianID.HasValue
                        ? null
                        : database.Physicians.First(reqPhy => reqPhy.phy_PhysicianID == order.PhysicianID.Value)
                            .Person.per_DisplayName;

                OrderTypeID = order.OrderTypeID;
                OrderTypeName
                    = !order.OrderTypeID.HasValue
                        ? null
                        : database.OrderTypes.First(ordTyp => ordTyp.ordtyp_OrderTypeID == order.OrderTypeID.Value)
                            .ordtyp_OrderTypeName;

                RequesterLocationID = order.RequestingLocationID;
                RequesterLocationDescription
                    = !order.RequestingLocationID.HasValue
                        ? null
                        : database.RequesterLocations.First(
                            reqLoc => reqLoc.reqloc_RequesterLocationID == order.RequestingLocationID)
                            .reqloc_Description;

                RequestingWorkLocationID = order.RequestingWorkLocationID;
                RequestingWorkLocationDescription
                    = !order.RequestingWorkLocationID.HasValue
                        ? null
                        : database.WorkLocations.First(
                            worLoc => worLoc.worloc_WorkLocationID == order.RequestingWorkLocationID.Value)
                            .Practice.pra_Description;

                PatientCategoryID = order.PatientCategoryID;
                PatientCategoryName
                    = !order.PatientCategoryID.HasValue
                        ? null
                        : database.PatientCategories
                            .Where(
                                item =>
                                    item.patcat_DateTimeInactive == null || item.patcat_DateTimeInactive >= DateTime.Now)
                            .First(x => x.patcat_PatientCategoryID == order.PatientCategoryID)
                            .patcat_PatientCategoryName;


                CopyToPhysicianID = order.CopyToPhysicianID;
                CopyToPhysicianName
                    = !order.CopyToPhysicianID.HasValue
                        ? null
                        : database.Physicians
                            .Where(physician => physician.phy_PhysicianID == order.CopyToPhysicianID.Value)
                            .Select(_ => _.Person.per_DisplayName)
                            .FirstOrDefault();

                CopyToWorkLocationID = order.CopyToWorkLocationID;
                CopyToWorkLocationDescription
                    = !order.CopyToWorkLocationID.HasValue
                        ? null
                        : database.WorkLocations
                            .Where(worLoc => worLoc.worloc_WorkLocationID == order.CopyToWorkLocationID.Value)
                            .Select(x => x.Practice.pra_Description)
                            .FirstOrDefault();

                CopyToRequesterLocationID = order.CopyToRequesterLocationID;
                CopyToRequesterLocationDescription
                    = !order.CopyToRequesterLocationID.HasValue
                        ? null
                        : database.RequesterLocations
                            .Where(reqLoc => reqLoc.reqloc_RequesterLocationID == order.CopyToRequesterLocationID.Value)
                            .Select(x => x.reqloc_Description)
                            .FirstOrDefault();

                Examinations
                    = examinations.ToDictionary(_ => _.ExaminationID,
                        _ => new ExaminationSnapshot(database, _, cancellationReasons, cancellationDetails));
            }
        }

        /// <summary>
        /// Represents a snapshot of an examination at a certain point in time.
        /// This can then be compare to a snapshot of that same order at another point in time to determine the changes made to that order.
        /// </summary>
        internal class ExaminationSnapshot
        {
            internal string AccessionNumber { get; }
            internal int? ExaminationTypeID { get; }
            internal string Laterality { get; }
            internal bool? OverrideBilling { get; }
            internal string StatusID { get; }
            internal string ExaminationType { get; }
            internal int? CancellationReasonID { get; }
            internal string CancellationReasonText { get; }
            internal string CancellationDetails { get; }


            /// <summary>
            /// Create a snapshot of an examination
            /// </summary>
            /// <param name="examination">the examination</param>
            internal ExaminationSnapshot(Examination examination)
            {
                if (examination == null)
                {
                    return;
                }

                AccessionNumber = examination.Studies.Select(s => s.stu_AccessionNumber).FirstOrDefault();
                ExaminationTypeID = examination.ExaminationType.exatyp_ExaminationTypeID;
                Laterality = examination.exa_Laterality;
                OverrideBilling = examination.exa_OverrideBillingRules;
                StatusID = examination.Status.exasta_StatusID;

                ExaminationType
                    = examination.ExaminationType.exatyp_ExaminationTypeName
                      + (examination.ExaminationType.exatyp_Laterality ? $" ({Laterality})" : "");

                CancellationReasonID = examination.CancellationReason?.canrea_ReasonID;
                CancellationReasonText = examination.CancellationReason?.canrea_Text;
                CancellationDetails = examination.exa_CancellationReasonDetails;
            }

            /// <summary>
            /// Create a snapshot of an ExaminationViewModel.
            /// </summary>
            /// <param name="database">database to retrieve additional info (e.g. accession numbers, names, descriptions) from</param>
            /// <param name="examination">examination model</param>
            /// <param name="cancellationReasons">mapping from examination id to cancelation reason</param>
            /// <param name="cancellationDetails">mapping from examination id to cancelation details</param>
            public ExaminationSnapshot(IZillionRIS_Entities database, ExaminationViewModel examination,
                Dictionary<int, int> cancellationReasons, IReadOnlyDictionary<int, string> cancellationDetails)
            {
                if (examination == null)
                {
                    return;
                }

                AccessionNumber =
                    database.Examinations
                        .Where(_ => _.exa_ExaminationID == examination.ExaminationID)
                        .SelectMany(_ => _.Studies)
                        .Select(_ => _.stu_AccessionNumber)
                        .FirstOrDefault();

                ExaminationTypeID = examination.ExaminationTypeID;
                Laterality = examination.LateralityID;
                OverrideBilling = examination.OverrideBilling;
                StatusID = examination.ExaminationStatusID;

                ExaminationType =
                    database.ExaminationTypes
                        .Where(x => x.exatyp_ExaminationTypeID == ExaminationTypeID)
                        .Select(x => x.exatyp_ExaminationTypeName + (x.exatyp_Laterality ? " (" + Laterality + ")" : ""))
                        .FirstOrDefault();

                if (StatusID == ExaminationStatusValue.Cancelled &&
                    cancellationReasons.ContainsKey(examination.ExaminationID))
                {
                    CancellationReasonID = cancellationReasons[examination.ExaminationID];
                    CancellationReasonText
                        = database.CancellationReasons
                            .Where(_ => _.canrea_ReasonID == CancellationReasonID)
                            .Select(_ => _.canrea_Text)
                            .FirstOrDefault();
                }

                if (StatusID == ExaminationStatusValue.Cancelled &&
                    cancellationDetails.ContainsKey(examination.ExaminationID))
                {
                    CancellationDetails = cancellationDetails[examination.ExaminationID];
                }
            }
        }
    }
}
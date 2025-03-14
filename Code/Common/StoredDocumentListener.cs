using System;
using DelftDI.Common.RIS.Utilities;
using Rogan.ZillionRis.EntityData;
using Rogan.ZillionRis.Extensibility.Audit;
using Rogan.ZillionRis.StoredDocuments.Extensibility;

namespace Rogan.ZillionRis.Website.Code.Common
{
    public class StoredDocumentListener : IStoredDocumentListener
    {
        public void OnCreated(StoredDocumentChangedInfo context)
        {
            var auditor = context.Context.Get<IAuditor>();
            if (auditor == null) throw new ApplicationException("Auditor could not be found.");

            EntityData.Patient patient = null;
            Order order = null;
            Examination examination = null;

           foreach (object association in context.Association)
            {
                if (association.GetType() == typeof(EntityData.Patient))
                {
                    patient = (EntityData.Patient)association;
                    break;
                }
                if (association.GetType() == typeof (Order))
                {
                    order = (Order)association;
                    patient = order.Patient;
                    break;
                }
                if (association.GetType() == typeof (Examination))
                {
                    examination = (Examination)association;
                    order = examination.Order;
                    patient = order.Patient;
                }
            }
            var documentType = Urn.Parse(context.Document.stodoc_DocumentType);
            var auditObj = new
            {
                Title = context.Document.stodoc_Title,
                DocumentType = documentType.Namespace + "_" + documentType.Specification.Replace("/", ""),
                context.Action
            };

            var auditContext = new AuditContext
            {
                Order = order,
                Patient = patient, 
                Examination = examination
            };

            auditor.LogActionByDescription(AuditConstants.DocumentCreation, AuditedItems.StoredDocument, auditContext, auditObj);
        }
    }
}
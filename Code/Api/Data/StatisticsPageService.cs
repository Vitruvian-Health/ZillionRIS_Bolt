using DelftDI.Common.RIS.Json;
using DelftDI.ZillionRis.Logging;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Extensibility.Data;
using Rogan.ZillionRis.Reporting.Core;
using Rogan.ZillionRis.Web.Reflection;
using Rogan.ZillionRis.Workflow.Worklists;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Rogan.ZillionRis.Website.Code.Api.Data
{
    public class PrintSelectedReportRequestModel
    {
        public List<int> ReportIDs;
    }

    public class ResendSelectedXdsDocumentRequestModel
    {
        public List<int> XdsDocumentIDs { get; set; }
    }

    public class StatisticsPageService : ZillionRisBaseTask 
    {
        [TaskAction("request")]
        public IEnumerable<CrystalReportLogResult> Request()
        {
            return this.Context.DataContext.CrystalReportLogs
                .Select(log => new CrystalReportLogResult
                {
                    CrystalReportLogID = log.cryreplog_CrystalReportLogID,
                    Error = log.cryreplog_Error,
                    LogTimestamp = log.cryreplog_LogTimestamp,
                    ReportName = log.cryreplog_ReportName,
                    ReportParameters = log.cryreplog_ReportParameters,
                })
                .ToList();
        }

        [TaskAction("requestxdsdocuments")]
        public IEnumerable<XDSDocumentResult> RequestXdsDocuments()
        {
            return this.Context.DataContext.XDSPendingDocuments
                .Where(x=>x.pendoc_ServerError == false)
                .Select(log => new XDSDocumentResult
                {
                    PendingDocumentID = log.pendoc_PendingDocumentID,
                    ExaminationID = log.Examination.exa_ExaminationID,
                    AccessionNumber = log.Examination.Studies.Select(x => x.stu_AccessionNumber).FirstOrDefault(),
                    ReportID = log.Report.rep_ReportID,
                    ActionType = log.ActionType.acty_ActionTypeName,
                    CreationTime = log.pendoc_CreationTime,
                    ErrorMessage = log.pendoc_ErrorMessage,
                    Locked = log.pendoc_Locked,
                })
                .ToList();
        }

        [TaskAction("printselectedreports")]
        public object PrintSelectedReports(PrintSelectedReportRequestModel request)
        {
            if (request.ReportIDs.Count == 0 || Printing.LetterPrinterIsPdf(Context))
                return new
                {
                    type = "statusreport",
                    message = "Please select a correct printer."
                };                                   

            foreach (int reportID in request.ReportIDs)
            {
                var report = this.Context.DataContext.CrystalReportLogs.FirstOrDefault(x => x.cryreplog_CrystalReportLogID == reportID);
                    
                var parameters = report.cryreplog_ReportParameters.FromJson<Dictionary<string, object>>();

                foreach (var key in parameters.Keys.ToArray())
                {
                    if (parameters[key] != null)
                    {
                        string value = parameters[key].ToString();
                        if (value != null && value.StartsWith("urn:epoch:"))
                        {
                            value = value.Replace("urn:epoch:", "");
                            long t = long.Parse(value);
                            parameters[key] = EpochConverter.FromEpoch(t);
                        }
                    }
                }

                Printing.PrintReport2(report.cryreplog_ReportName, Context.PrinterSettings().LetterPrinterID, parameters, this.Context, reportID);
            }

            // Show print message.
            return new
            {
                type = "statusreport",
                message = "Printing request sent. Please wait a minute. Depending on the amount of reports this might take longer."
            };
        }

        [TaskAction("resendselectedxdsdocuments")]
        public object ResendSelectedXdsDocuments(ResendSelectedXdsDocumentRequestModel request)
        {
            var listeners = IocContainer.Instance.AllOf<IXdsDocumentResendListener>();
            foreach (var listener in listeners)
            {
                try
                {
                    var item = new XdsDocumentResendContext();
                    item.PendingDocumentIds = request.XdsDocumentIDs;

                    listener.HandleChanged(item);
                }
                catch (Exception ex)
                {
                    ZillionRisLog.Default.Error("Error resending the Xds Documents: Listener error.", ex);
                    return new 
                    {
                        error = true,
                        message = "Error resending the Xds Documents"
                    };
                }
            }
            return null;
        }
        
    }
}
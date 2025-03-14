using System.Globalization;
using System.Web;

using Rogan.ZillionRis.Configuration;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Reporting.Core;
using Rogan.ZillionRis.Web.Reflection;

namespace Rogan.ZillionRis.Website.Code.Legacy
{
    public class PrintPatientLabelTask : ZillionRisBaseTask 
    {
        public class PrintPatientLabelRequest
        {
            public int OrderID { get; set; }
            public bool CheckForAutoPrint { get; set; }
        }

        public sealed class PrintPatientLabelModel
        {
            public int OrderID { get; set; }
            public string PrintUrl { get; set; }
        }

        [TaskAction("request")]
        public object PrintPatientLabel(PrintPatientLabelRequest request)
        {
            var model = new PrintPatientLabelModel();
            bool print = true;
            if (request.CheckForAutoPrint)
            {
                print = RisAppSettings.AutoPrintPatientLabel;
            }

            if (print)
            {
                if (Printing.LabelPrinterIsPdf(Context))
                {
                    model.OrderID = request.OrderID;
                    model.PrintUrl = VirtualPathUtility.ToAbsolute(string.Format("~/PatientLabel.ashx?order={0}&lang={1}", request.OrderID, CultureInfo.CurrentCulture.TwoLetterISOLanguageName));
                }
                else
                {
                    Printing.PrintPatientLabel(request.OrderID, Context, Context.PrinterSettings().LabelPrinterID);
                }
            }
            return model;
        }
    }
}
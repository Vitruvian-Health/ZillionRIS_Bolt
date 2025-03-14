using System.Globalization;
using System.Web;

using Rogan.ZillionRis.Business;
using Rogan.ZillionRis.EntityData;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Reporting.Core;
using Rogan.ZillionRis.Web.Reflection;

namespace Rogan.ZillionRis.Website.Code.Legacy
{
    public class PrintDnaLetterTask : ZillionRisBaseTask 
    {
        public class PrintDnaLettersRequest
        {
            public int OrderID { get; set; }
        }

        public sealed class PrintDnaLettersModel
        {
            public int OrderID { get; set; }
            public string PrintUrl { get; set; }
        }

        [TaskAction("request")]
        public object PrintDnaLetters(PrintDnaLettersRequest request)
        {
            var model = new PrintDnaLettersModel();

            model.OrderID = request.OrderID;

            if (Printing.LetterPrinterIsPdf(Context))
            {
                model.PrintUrl = VirtualPathUtility.ToAbsolute(string.Format("~/DNALetter.ashx?order={0}&lang={1}", request.OrderID, CultureInfo.CurrentCulture.TwoLetterISOLanguageName));
            }
            else 
            {
                Printing.PrintDnaLetters(request.OrderID, Context.User.UserID, Context, Context.PrinterSettings().LetterPrinterID);
            }
            AuditConcerns.AuditPrintAction(Context, AuditedItems.DnaLetter, request.OrderID);

            return model;
        }
    }
}
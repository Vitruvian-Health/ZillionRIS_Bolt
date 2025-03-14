using DelftDI.Common.RIS.Json;
using Rogan.ZillionRis.Globalization;
using Rogan.ZillionRis.Web.Handlers.ReflectionRequest;
using Rogan.ZillionRis.WebControls.Extensibility;
using System;
using System.Linq;

namespace Rogan.ZillionRis.Website.Code.Api.Data
{
    public class CultureService : RisReflectionController
    {
        [ReflectionAction("Main")]
        public JavaScriptLiteralResponse Main(string culture)
        {
            var cultureInfo = CultureHelper.CreateCultureInfo(culture);

            var summary =
                new
                {
                    name = cultureInfo.DisplayName,
                    dateTime = new
                    {
                        dateTimeFull = cultureInfo.DateTimeFormat.FullDateTimePattern,
                        dateLong = cultureInfo.DateTimeFormat.LongDatePattern,
                        dateShort = cultureInfo.DateTimeFormat.ShortDatePattern,
                        timeLong = cultureInfo.DateTimeFormat.LongTimePattern,
                        timeShort = cultureInfo.DateTimeFormat.ShortTimePattern,
                        firstDayOfWeek = cultureInfo.DateTimeFormat.FirstDayOfWeek,
                        firstDayOfWeekInt = (int) cultureInfo.DateTimeFormat.FirstDayOfWeek,
                        yearMonth = cultureInfo.DateTimeFormat.YearMonthPattern,
                        days = cultureInfo.DateTimeFormat.DayNames,
                        daysShort = cultureInfo.DateTimeFormat.AbbreviatedDayNames,
                        months = cultureInfo.DateTimeFormat.MonthNames.Take(12),
                        monthsShort = cultureInfo.DateTimeFormat.AbbreviatedMonthNames.Take(12),
                    }
                };

            return new JavaScriptLiteralResponse("window['currentCulture']=" + summary.ToJson() + ";")
            {
                ValidUntil = DateTime.Now.AddDays(1d)
            };
        }
    }
}
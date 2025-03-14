using System;

namespace Rogan.ZillionRis.Website.Code.Api.Data
{
    public static class EpochConverter
    {
        public static long ToEpoch(DateTime time)
        {
            return (time.ToUniversalTime().Ticks - 621355968000000000L) / 10000000L; 
        }
        public static DateTime FromEpoch(double time)
        {
            long baseTicks = 621355968000000000L;
            long tickResolution = 10000000L;
            long epoch = 1225815911L;
            long epochTicks = (epoch * tickResolution) + baseTicks;

            return new DateTime(epochTicks, DateTimeKind.Utc);
        }
    }
}
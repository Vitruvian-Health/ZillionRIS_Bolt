using Rogan.ZillionRis.Extentions;
using System;
using System.Text.RegularExpressions;

namespace Rogan.ZillionRis.Website.Code.Legacy
{
    /// <summary>
    /// </summary>
    public sealed class DBVersionNumber : IComparable
    {
        public DBVersionNumber(int major, int minor, char revision)
        {
            Major = major;
            Minor = minor;
            Revision = revision;
        }

        public int Major { get; set; }
        public int Minor { get; set; }
        public char Revision { get; set; }

        public string Text
        {
            get { return string.Format("{0}.{1}.{2}", Major, Minor, Revision); }
        }

        public int CompareTo(object obj)
        {
            var other = obj as DBVersionNumber;
            if (other == null)
                return -1;
            if (other.Major > Major)
                return -1;
            if (other.Major < Major)
                return 1;
            if (other.Minor > Minor)
                return -1;
            if (other.Minor < Minor)
                return 1;
            if (other.Revision > Revision)
                return -1;
            if (other.Revision < Revision)
                return 1;

            return 0;
        }

        public bool Equals(DBVersionNumber other)
        {
            return Major == other.Major && Minor == other.Minor && Revision == other.Revision;
        }

        public override bool Equals(object obj)
        {
            if (ReferenceEquals(null, obj)) return false;
            if (ReferenceEquals(this, obj)) return true;
            if (obj.GetType() != GetType()) return false;
            return Equals((DBVersionNumber) obj);
        }

        public override int GetHashCode()
        {
            unchecked
            {
                var hashCode = Major;
                hashCode = (hashCode*397) ^ Minor;
                hashCode = (hashCode*397) ^ Revision.GetHashCode();
                return hashCode;
            }
        }

        public static bool operator ==(DBVersionNumber left, DBVersionNumber right)
        {
            return Equals(left, right);
        }

        public static bool operator !=(DBVersionNumber left, DBVersionNumber right)
        {
            return !Equals(left, right);
        }

        public override string ToString()
        {
            return Text;
        }

        public static bool TryParse(string text, out DBVersionNumber version)
        {
            var r = new Regex(@"(\d+)\.(\d+).(\d+)", RegexOptions.Compiled | RegexOptions.Singleline);
            var m = r.Match(text);
            version = null;

            if (!m.Success)
            {
                return false;
            }

            if (m.Groups.Count < 3)
            {
                return false;
            }

            var major = m.Groups[1].Value.ToInt32();
            var minor = m.Groups[2].Value.ToInt32();
            var rev = m.Groups[3].Value[0];

            version = new DBVersionNumber(major, minor, rev);

            return true;
        }

        public static DBVersionNumber Parse(string text)
        {
            DBVersionNumber number;
            TryParse(text, out number);

            return number;
        }
    }
}
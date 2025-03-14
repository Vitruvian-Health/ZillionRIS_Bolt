using System.Web.UI;

namespace ZillionRis
{
    public interface IMasterPage
    {
        #region Properties
        /// <summary>
        ///     Gets or sets the script manager from the master page.
        /// </summary>
        /// <value>The script manager.</value>
        ScriptManager ScriptManager { get; }
        #endregion
    }
}
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Web.UI;
using DelftDI.Common.RIS.Common;
using DelftDI.Common.RIS.Utilities;
using Rogan.ZillionRis;
using Rogan.ZillionRis.WebControls.Common;
using Rogan.ZillionRis.Website.App_GlobalResources;
using ZillionRis.Common;

public partial class PopupMessageControl : UserControl, IPostBackEventHandler
{
    #region Properties
    /// <summary>
    /// 	Gets or sets the error icon URL.
    /// </summary>
    /// <value>The error icon URL.</value>
    /// <remarks>
    /// 	<para>Created by tdgroen on 2010-08-23.</para>
    /// </remarks>
    public string ErrorIconUrl { get; set; }

    /// <summary>
    /// 	Gets or sets the header text.
    /// </summary>
    /// <value>The header text.</value>
    /// <remarks>
    /// 	<para>Created by tdgroen on 2010-09-27.</para>
    /// </remarks>
    public string HeaderText
    {
        get { return (string)this.ViewState["Title"]; }
        set { this.ViewState["Title"] = value; }
    }

    /// <summary>
    /// 	Gets or sets the information icon URL.
    /// </summary>
    /// <value>The information icon URL.</value>
    /// <remarks>
    /// 	<para>Created by tdgroen on 2010-08-23.</para>
    /// </remarks>
    public string InformationIconUrl { get; set; }

    protected string PopupClientID
    {
        get { return this.ClientID + "_P"; }
    }

    protected string MessageText { get; set; }
    protected string TechnicalDetailsText { get; set; }
    #endregion

    #region Events
    /// <summary>
    /// 	Occurs when the popup has been closed.
    /// </summary>
    public event EventHandler PopupClosed;
    #endregion

    #region Constructors
    /// <summary>
    /// 	Initializes a new instance of the <see cref = "PopupMessageControl" /> class.
    /// </summary>
    /// <remarks>
    /// 	<para>Created by tdgroen on 2010-08-23.</para>
    /// </remarks>
    public PopupMessageControl()
    {
        this.InformationIconUrl = "~/Styles/Default/Images/Info.png";
        this.ErrorIconUrl = "~/Styles/Default/Images/Error.png";
    }
    #endregion

    #region Private/Protected Methods
    protected override void OnInit(EventArgs e)
    {
        base.OnInit(e);

        var scriptManager = ScriptManager.GetCurrent(this.Page);
        if (scriptManager != null)
            scriptManager.RegisterAsyncPostBackControl(this);
    }

    /// <summary>
    /// Raises the <see cref="E:System.Web.UI.Control.PreRender"/> event.
    /// </summary>
    /// <param name="e">An <see cref="T:System.EventArgs"/> object that contains the event data.</param>
    /// <remarks>
    /// 	<para>Created by tdgroen at 2012-02-20.</para>
    /// </remarks>
    protected override void OnPreRender(EventArgs e)
    {
        if (this._script.Length > 0)
        {
            var scriptText = this._script
                .Replace("$controlid", this.PopupClientID)
                .Replace("$controlsel", "$('#" + this.PopupClientID + "')")
                .Insert(0, "$(function(){")
                .Append("});")
                .ToString();

            this._script.Clear();

            ScriptManager.RegisterStartupScript(this.Message, typeof (PopupMessageControl), "Action", scriptText, true);
        }

        base.OnPreRender(e);
    }

    /// <summary>
    /// 	Handles the Clicked event of the OkButton control.
    /// </summary>
    /// <param name = "sender">The source of the event.</param>
    /// <param name = "e">The <see cref = "System.Web.UI.ImageClickEventArgs" /> instance containing the event data.</param>
    protected void ClosePopup_Clicked(object sender,
                                      EventArgs e)
    {
        this.ClosePopup();
    }

    /// <summary>
    /// 	Invokes the popup closed event.
    /// </summary>
    protected void OnPopupClosed()
    {
        if (this.PopupClosed != null)
            this.PopupClosed(this, EventArgs.Empty);
    }
    #endregion

    #region Methods
    private readonly StringBuilder _script = new StringBuilder();

    /// <summary>
    /// 	Closes the message popup.
    /// </summary>
    /// <remarks>
    /// 	<para>Created by tdgroen on 2010-08-23.</para>
    /// </remarks>
    public void ClosePopup()
    {
        this._script.Append("$controlsel.dialog('close');");
    }

    /// <summary>
    /// 	Shows the custom message in the popup.
    /// </summary>
    /// <param name = "headerText">The header text.</param>
    /// <param name = "message">The message.</param>
    /// <param name = "technicalDetails">The technical details (optional).</param>
    /// <param name = "iconUrl">The icon URL.</param>
    /// <remarks>
    /// 	Created by tdgroen on 2010-08-23.
    /// </remarks>
    public void ShowCustomMessage(string headerText,
                                  string message,
                                  string technicalDetails,
                                  string iconUrl)
    {
        Precondition.ArgumentNotNullOrEmpty("message", message);

        this.HeaderText = headerText;

        if (iconUrl == this.ErrorIconUrl)
        {
            this.IconCss.CssClass = "icon-error";
            this.IconCss.Visible = true;
            this.MessageIcon.Visible = false;
        }
        else
        {
            this.IconCss.Visible = false;
            this.MessageIcon.ImageUrl = iconUrl;
            this.MessageIcon.Visible = true;
        }
        this.Icon.Update();

        this.TechnicalDetailsText = technicalDetails;
        this.TechnicalDetails.Visible = string.IsNullOrEmpty(technicalDetails) == false;

        this.MessageText = message;
        this.Message.Update();

        this._script.Append("$controlsel.dialog('option', 'title', " + this.HeaderText.ToJsStringLiteral() + ");");
        this._script.Append("$controlsel.dialog('open');");
    }

    /// <summary>
    /// 	Shows an error message in the popup.
    /// </summary>
    /// <param name = "message">The message.</param>
    public void ShowErrorMessage(string message)
    {
        this.ShowErrorMessage(message, string.Empty);
    }

    /// <summary>
    /// 	Shows an error message in the popup.
    /// </summary>
    /// <param name = "message">The message.</param>
    /// <param name = "technicalDetails">The technical details.</param>
    public void ShowErrorMessage(string message,
                                 string technicalDetails)
    {
        this.ShowCustomMessage(WebResources.PopupMessageControl_ErrorHeaderText, message, technicalDetails, this.ErrorIconUrl);
    }

    /// <summary>
    /// 	Shows the error message in the popup.
    /// </summary>
    /// <param name = "description">The description.</param>
    /// <param name = "exception">The exception.</param>
    /// <remarks>
    /// 	<para>Created by tdgroen on 2010-08-23.</para>
    /// </remarks>
    public void ShowErrorMessage(string description,
                                 Exception exception)
    {
        // TODO: When Rogan.Common has been updated change to: list = exception.ForEachInnerProperty(ex => ex.InnerException).

        var exceptionList = CreateExceptionList(exception);
        var exceptionMessages = exceptionList.Select(item => item.Message).JoinText("\r\n\r\n");

        switch (RisApplication.Current.InformationLevel)
        {
            case UserInformationLevel.Expert:
                {
                    var technicalDetails = exceptionList.Select(item => item.ToString()).JoinText("\r\n\r\n");

                    this.ShowCustomMessage(WebResources.PopupMessageControl_ErrorHeaderText,
                                           description + "\r\n\r\n" + exceptionMessages,
                                           technicalDetails,
                                           this.ErrorIconUrl);
                }
                break;

            default:
                {
                    this.ShowCustomMessage(WebResources.PopupMessageControl_ErrorHeaderText,
                                           description + "\r\n\r\n" + exceptionMessages,
                                           null,
                                           this.ErrorIconUrl);
                }
                break;
        }
    }

    private static List<Exception> CreateExceptionList(Exception exception)
    {
        var list = new List<Exception>();
        while (exception != null)
        {
            list.Add(exception);
            exception = exception.InnerException;
        }
        return list;
    }

    /// <summary>
    /// 	Shows the informational message in the popup.
    /// </summary>
    /// <param name = "message">The message.</param>
    public void ShowInfoMessage(string message)
    {
        this.ShowInfoMessage(message, null);
    }

    /// <summary>
    /// 	Shows the informational message in the popup.
    /// </summary>
    /// <param name = "message">The message.</param>
    /// <param name = "technicalDetails">The technical details.</param>
    public void ShowInfoMessage(string message,
                                string technicalDetails)
    {
        this.ShowCustomMessage(WebResources.PopupMessageControl_InformationHeaderText, message, technicalDetails, this.InformationIconUrl);
    }
    #endregion

    #region IPostBackEventHandler Members
    public void RaisePostBackEvent(string eventArgument)
    {
        if (eventArgument == "close")
            this.OnPopupClosed();
    }
    #endregion
}

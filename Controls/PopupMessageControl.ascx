<%@ Control Language="C#" AutoEventWireup="true" Inherits="PopupMessageControl" CodeBehind="PopupMessageControl.ascx.cs" %>
<%@ Import Namespace="Rogan.ZillionRis.WebControls.Common" %>
<%@ Import Namespace="Rogan.ZillionRis.Website.App_GlobalResources" %>
<div id="<%=this.PopupClientID%>">
    <div style="position: relative; width: 100%">
        <div id="MessagePanel">
            <div style="position: absolute; left: 0px; top: 0px">
                <asp:UpdatePanel ID="Icon" UpdateMode="Conditional" RenderMode="Inline" runat="server">
                    <ContentTemplate>
                        <asp:Image ID="MessageIcon" runat="server" />
                        <asp:Panel ID="IconCss" runat="server" />
                    </ContentTemplate>
                </asp:UpdatePanel>
            </div>
            <asp:UpdatePanel ID="Message" UpdateMode="Conditional" RenderMode="Block" style="margin-left: 70px;
                margin-top: 10px" runat="server">
                <ContentTemplate>
                    <%= this.MessageText.ToHtmlEncodedText() %>
                    <asp:Panel ID="TechnicalDetails" CssClass="message-technical-details" Style="color: #666666;
                        display: block; margin-top: 1em" Visible="false" runat="server">
                        <span style="display: block; background-color: #c0c0c0; color: #444444;">Technical details:</span>
                        <div style="max-height: 240px; overflow: auto; border: solid 1px #c0c0c0; margin: auto">
                            <pre style="margin: 0.5em"><%: this.TechnicalDetailsText %></pre>
                        </div>
                    </asp:Panel>
                </ContentTemplate>
            </asp:UpdatePanel>
        </div>
    </div>
</div>
<script>
    $(function () {
        $('#<%=this.PopupClientID%>').dialog({
            autoOpen: false,
            modal: true,
            width: 720,
            height: 'auto',
            close: function () {
                if (window.parent.statusChangeCallback) {
                    var args = { errorMessage: '', resultCode: 'after-global-popup', cancelPostback: false };
                    window.parent.statusChangeCallback(window, args);
                    if (!args.cancelPostback) {
                        __doPostBack('<%=this.UniqueID%>', 'close');
                    }
                }
            },
            buttons: [{ text: '<%:WebResources.General_ConfirmButton%>', click: function () {
                $(this).dialog('close');
            }
            }]
        });
    });
</script>

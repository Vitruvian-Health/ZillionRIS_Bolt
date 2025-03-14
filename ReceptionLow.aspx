<%@ Page Language="C#" EnableViewState="false" AutoEventWireup="true" CodeBehind="ReceptionLow.aspx.cs" Inherits="ZillionRis.ReceptionLow" %>
<%@ Import Namespace="ZillionRis.Common" %>

<asp:content contentplaceholderid="HeadContent" runat="server">
</asp:content>

<asp:content id="Content3" contentplaceholderid="MainContent" runat="server">
    <%= this.RenderView("module://reception/view/page") %>
</asp:content>

<asp:content id="Content4" contentplaceholderid="FooterContent" runat="server">
    <%= this.Include("module://workflow/script/schedulenow")%>
    <%= this.Include("module://reception/script/page")%>
    <%= this.Include("module://reception/script/filter")%>
</asp:content>

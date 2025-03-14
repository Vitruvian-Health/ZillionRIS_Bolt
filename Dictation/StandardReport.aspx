<%@ Page Language="C#" AutoEventWireup="true" Inherits="Rogan.ZillionRis.Website.Dictation.StandardReport" MasterPageFile="~/LowProfileMaster.master" %>
<%@ Import Namespace="ZillionRis.Common" %>
<asp:Content ID="Content1" ContentPlaceHolderID="HeadContent" runat="server">
	<%= this.Style("module://dictation/content/standard-report") %>
	<%= this.Include("module://dictation/script/standard-report") %>
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="MainContent" runat="server">
	<%= this.RenderView("module://dictation/view/standard-report")%>
</asp:Content>
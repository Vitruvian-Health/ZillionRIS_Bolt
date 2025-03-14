<%@ Page Language="C#" AutoEventWireup="True" CodeBehind="frmAdvancedFilter.aspx.cs" Inherits="ZillionRis.AdvancedFilter" EnableEventValidation="false" %>
<%@ Import Namespace="Rogan.ZillionRis.Website.App_GlobalResources" %>

<%@ Register TagPrefix="CD" Namespace="ClientDependency.Core.Controls" Assembly="ClientDependency.Core" %>

<asp:Content ContentPlaceHolderID="HeadContent" runat="Server">
    <CD:JsInclude ID="JsInclude1" FilePath="~/frmAdvancedFilter.js" Priority="101" runat="server" />
</asp:Content>
<asp:Content ContentPlaceHolderID="MainContent" runat="Server">
    <fieldset class="input-fieldset">
        <div id="CriteriasDiv">
            <table class="details-table details-table-padded-cell">
                <tr>
                    <td style="float: left" class="label"><%: WebResources.ltLocation %></td>
                    <td>
                        <span style="float: left;width:180px" data-bind="zpSelect: { source: locationSource.locations, behavior: 'single', enableSearch: true,  captionText: '<%: WebResources.AdvancedFilter_AllLocations %>', selectText: 'displayName', selectedID: locationSource.currentLocation, disabled: locationSource.disableLocationSelector }">
                        </span>
                    </td>
                </tr>
                <tr>
                    <td style="float: left" class="label"><%: WebResources.ltCriterion %></td>
                    <td>
                        <span style="width: 180px"  data-bind="zpSelect: { source: availableFilterTypes,  behavior: 'single', captionText: '<%: WebResources.AdvancedFilter_CriterionCaption %>', selectedID: selectedFilterType }, validation: { valid: selectedFilterType }">
                        </span>
                    </td>
                    <td style="float: left;width: 200px" class="label"><%: WebResources.ltValue %></td>
                    <td>
                        <span style="float: left;width:250px;" data-bind="zpSelect: { source: valueSourceProxy, behavior: 'single', enableSearch: true,  captionText: '<%: WebResources.AdvancedFilter_ValueCaption %>', selectedID: selectedValue, disabled: disableSelectValue() }, visible: notPatientNumberSearch(), validation: { valid: selectedValue, disabled: disableSelectValue() || requesterSearch() }">
                        </span>
                        <input style="float: left;width:250px;" type="text" class="ui-input" data-bind="value: patientNumber, visible: patientNumberSearch(), validation: { valid: patientNumber, disabled: notPatientNumberSearch() }" />
                    </td>
                 
                    <td style="float: left;width: 200px; display:none;" class="label RadiologistFilter"><%: WebResources.PatientSearch_ModalityType %></td>
                    <td style="display:none;" class="RadiologistFilter">
                        <span style="float: left;width:250px" data-bind="zpSelect: { source:  modalityTypes, behavior: 'single', captionText: '<%: WebResources.AdvancedFilter_ValueCaption %>', selectedID: selectedModalityType }"></span>
                    </td>
                    <td style="float: left;width: 200px;display:none;" class="RadiologistFilter label"><%: WebResources.ltPatientCategory %></td>
                    <td style="display:none;" class="RadiologistFilter">
                        <span style="float: left;width:250px" data-bind="zpSelect: { source: patientCategories, behavior: 'single', enableSearch: true,  captionText: '<%: WebResources.AdvancedFilter_ValueCaption %>', selectedID: selectedPatCat }">
                        </span>
                    </td>
                </tr>
                <tr>
                    <td style="float: left" class="label"><%: WebResources.ltFrom %></td>
                    <td>
                        <input style="float: left;width: 180px" class="ui-input" type="text" data-bind="datepicker: dateFrom, validation: { valid: dateFrom } "  />
                    </td>
                    <td style="float: left" class="label"><%: WebResources.ltFunctionSpecialisation %></td>
                    <td>
                        <span style="float: left;width:250px" data-bind="zpSelect: { source: functionSpecializations, behavior: 'single', enableSearch: true,  captionText: '<%: WebResources.AdvancedFilter_NoFilterSelected %>', selectedID: selectedFuncSpec }">
                        </span>
                    </td>
                    <td style="float: left;width: 200px;display:none;" class="RadiologistFilter label"><%: WebResources.AdvancedFilter_ReportType%></td>
                    <td style="display:none;" class="RadiologistFilter">
                        <span style="float: left;width:250px" data-bind="zpSelect: { source: reportStatuses, behavior: 'single', enableSearch: true,  captionText: '<%: WebResources.AdvancedFilter_NoFilterSelected %>', selectedID: selectedRepStatus }">
                    </span>
                    </td>
                    <td>
                        <button id="SearchButton" style="float: left" type="button" class="btn" onclick="onSearchClick();" data-bind="button: {}" ><%:WebResources.ltSearch %></button>
                    </td>
                </tr>
                <tr>
                    <td class="label"><%: WebResources.ltTo %></td>
                    <td>
                        <input style="width: 180px" class="ui-input" type="text" data-bind="datepicker: dateTo, validation: { valid: dateTo }" />
                    </td>
                    <td data-bind="visible: disableSelectValue() || requesterSearch()" class="label"><%: WebResources.ltEmptyMailboxNumbers %></td>
                    <td data-bind="visible: disableSelectValue() || requesterSearch()">
                        <input id="EmptyMailBoxNumbers" style="float: left" type="checkbox" data-bind="checked: mailboxNumber" />
                    </td>
                </tr>
                <tr>
                    <td class="label"><label for="scheduleDate"><%: WebResources.ltUseScheduleDate%></label></td>
                    <td><input type="radio" name="DateSelector" id="scheduleDate" value="scheduleDate" data-bind="checked: dateSelector"/></td>
                </tr>
                <tr>
                    <td class="label"><label for="authorizationDate"><%: WebResources.ltUseAuthorisationDate %></label></td>
                    <td><input type="radio" name="DateSelector" id="authorizationDate" value="authorizationDate" data-bind="checked: dateSelector"/></td>
                </tr>
            </table>
        </div>
    </fieldset>
    <div id="AdvancedFilterGridContainer" class="ui-group-panel" zp-fluids="fill" zp-fluids-height="height - fieldsetHeight" style="margin-top: 10px;">
        <div class="ui-group-panel-header" zp-fluids="fixed">
            <span class="ui-group-panel-title">
                <i style="display: inline-block; margin-right: 8px; vertical-align: middle;" data-bind="roganLoading: isLoading"></i><span data-bind="text: title"></span>
            </span>
        </div>
        <div id="AdvancedFilterGridPanel" class="ui-group-panel-content no-padding" zp-fluids="fill">
            <div id="AdvancedFilterGridView" zp-fluids="fill"
                 data-bind="virtualDataGrid: { options: gridOptions, singleSelect: selectedItem }, loadingOverlay: { message: locfmt('{ris,General_LoadingOverlay}'), show: isLoading(), delay: 10 }">
            </div>
        </div>
        <div class="ui-group-panel-toolbar bottom" style="text-align: right;" zp-fluids="fixed">
            <button type="button" class="btn" onclick="ExportButton_OnClick();"  data-bind="button: {}" id="ExportButton"><%:WebResources.AdvancedFilter_ExportButton %></button>
            <button type="button" class="btn" onclick="selectAllButton_click();" data-bind="button: {}" id="SelectAllButton"><%: WebResources.ltSelectAll %></button>
            <button type="button" class="btn" onclick="printSelectedReportsButton_Click();" data-bind="button: {}, enable: enablePrint" id="PrintReportsButton"><%:WebResources.ltPrintSelectedReports%></button>
            <button type="button" class="btn" onclick="printButton_OnClick();" data-bind="button: {}" id="PrintAllReportsButton" ><%:WebResources.ltPrint%></button>
        </div>
    </div>
</asp:Content>

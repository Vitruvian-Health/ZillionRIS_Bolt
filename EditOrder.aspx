<%@ Page Title="" Language="C#" AutoEventWireup="true" Inherits="Rogan.ZillionRis.Website.EditOrder" CodeBehind="EditOrder.aspx.cs" %>
<%@ Import Namespace="Rogan.ZillionRis.Configuration" %>
<%@ Import Namespace="Rogan.ZillionRis.Website.App_GlobalResources" %>
<%@ Register TagPrefix="CD" Namespace="ClientDependency.Core.Controls" Assembly="ClientDependency.Core" %>
<asp:content contentplaceholderid="HeadContent" runat="server">
    <CD:JsInclude ID="JsInclude1" FilePath="~/EditOrder.js" Priority="101" runat="server" />
    <%= this.Script("module://workflow/script/schedulenow")%>
    <%= this.Script("module://reception/script/schedule") %>
    <style>
        body { background: #cedff2; }
        .group-panel-title { margin-top: 20px; }
        .group-panel { margin-top: 15px; padding: 7px 12px; }
        .new-form .new-form-entry { width: 200px; display: inline-block; float: left; margin-top: 5px; margin-right: 12px; }
        .new-form .new-form-entry .ui-input { width: 200px; }
        .new-form label { float: left; text-align: left; margin-bottom: 0; }
        .new-form .zpselect, .readonly-text { float: left; margin: 0 0 5px 0; }
        .new-form .zpselect { width: 200px; }
        .new-form-checkbox { margin-right: 1px; }
        .new-form-checkbox input[type=checkbox] { position: relative; top: 1px; }
        .exam-clinical-info-title { margin: 14px 5px 3px; }
        .exam-clinical-info-title:first-child { margin-top: 5px; }
        [id$=_ExaminationPanel] a[href] { margin-right: 4px; }
        [id$=_ExaminationPanel] th { padding-left: 3px; padding-top: 5px; text-align: left; }
        [id$=_ExaminationPanel] th.ris-status-command-header { padding-left: 0; }
        [id$=_ExaminationPanel] td { padding-left: 3px; padding-bottom: 1px; vertical-align: top; }
        [id$=_ExaminationPanel] td[id$=_Cmd], [id$=_ExaminationPanel] td[id$=_StatusCmd] { padding-left: 0; }
        [id$=_ExaminationPanel] td[id$=_Cmd] { padding-top: 4px; }
        .ris-override-billing-header { text-align: center; white-space: nowrap; }
        .ris-override-billing-header input { margin-top: 0; margin-left: 5px; position: relative; top: 2px; }
        .ris-override-billing { text-align: center; }
        .ris-override-billing input { position: relative; top: 2px; }
        .no-schedule-found { color: #888; }
        input[id$=_ScanRequestFormCheckBox] { margin-right: 3px; }
    </style>
</asp:content>
<asp:content contentplaceholderid="MainContent" runat="server">
    <%= this.Hidden(m => m.PatientGPPhysicianID) %>

    <div class="sub-page-nav" style="width: 1156px; margin: auto; padding: 20px;">
        <div>
            <%
                switch (Behavior)
                {
                    case EditOrderBehavior.CreateOrder:
            %>
                        <h1 class="section-title sub-page-nav-title"><%: WebResources.EditOrder_CreateOrderFor %><%: OrderController.PatientSource.Person.per_DisplayName %></h1>
                        <%
                        break;
                    case EditOrderBehavior.CreateOrderManuallyPlannned:
                        %>
                        <h1 class="section-title sub-page-nav-title"><%: WebResources.EditOrder_ManualPlanning %><%: OrderController.PatientSource.Person.per_DisplayName %></h1>
                        <%
                        break;
                    case EditOrderBehavior.ImportOrder:
                        %>
                        <h1 class="section-title sub-page-nav-title"><%: WebResources.EditOrder_ImportOrder %><%: OrderController.PatientSource.Person.per_DisplayName %></h1>
                        <%
                        break;
                    case EditOrderBehavior.EditOrder:
                        if (ReadOnlyBehaviour != ReadOnlyLevel.Full)
                        {
                        %>
                            <h1 class="section-title sub-page-nav-title"><%: WebResources.editOrder_EditingOrder %> <%: OrderController.OrderNumber %> <%: WebResources.ltFor %> <%: OrderController.PatientSource.Person.per_DisplayName %></h1>
                            <%
                        }
                        else
                        {
                            %>
                            <h1 class="section-title sub-page-nav-title"><%: WebResources.EditOrder_ViewingOrder %> <%: OrderController.OrderNumber %> <%: WebResources.ltFor %> <%: OrderController.PatientSource.Person.per_DisplayName %></h1>
                            <%
                        }
                        break;
                }
                            %>
        </div>
        <div class="sub-page-nav-inner-content ui-corner-all">
        <div style="padding: 15px 20px;">
            <div class="group-panel-title" style="margin-top: 0;"><%: WebResources.ltOrderInformation %></div>
            <div class="group-panel shaded-panel new-form inline-block-clearfix" style="width: 100%; padding-right: 0;">
                <div class="inline-block-clearfix" style="padding-bottom: 6px;">

                    <div class="new-form-entry" data-bind="<%= string.Format("visible: {0}", OrderController.PatientCategories.Any().ToJSBool()) %>">
                        <label><%: WebResources.ltPatientCategory %>:</label>
                        <%= this.ComboBox(m => m.PatientCategoryID, this.OrderController.PatientCategories, "ID", "DisplayName", true, new { style = "display: none" })%>
                        <span id="PatientCategorySelect" data-bind="zpSelect: { bind: '[name=PatientCategoryID]', legacyBind: true,  behavior: 'single', captionText: patientCategoryCaption(), selectedID: patientCategory, disabled: disablePatientCategories() || <%= (ReadOnlyBehaviour >= ReadOnlyLevel.OrderLevelOnly).ToJSBool() %> }, validation: { valid: patientCategory, disabled: disablePatientCategories() }"></span>
                    </div>

                    <div class="new-form-entry">
                        <label><%: WebResources.ltReferralType %>:</label>
                        <%= this.Hidden(m => m.ReferralTypeID )%>
                        <span id="ReferralSelect" data-bind="zpSelect: { bind: '[name=ReferralTypeID]', legacyBind: true, source: referralTypeSource, behavior: 'single', captionText: locfmt('{ris,EditOrder_SelectReferralType}'), value: referralType, disabled: <%= (ReadOnlyBehaviour >= ReadOnlyLevel.OrderLevelOnly).ToJSBool() %> }, validation: { valid: referralType }"></span>
                    </div>

                    <div class="new-form-entry">
                        <label><%: WebResources.ltReferringPhysician %>:</label>
                        <%= this.Hidden(m => m.PhysicianID)%>
                        <span id="PhysicianSelect" data-bind="zpSelect: { bind: '[name=PhysicianID]', legacyBind: true, source: referringPhysicianSource, behavior: 'single', enableSearch: true,  captionText: locfmt('{ris,EditOrder_SelectPhysician}'), value: referringPhysician, disabled: disableReferringPhysician() || <%= (ReadOnlyBehaviour >= ReadOnlyLevel.OrderLevelOnly).ToJSBool() %> }, validation: { valid: referringPhysician, disabled: disableReferringPhysician() }"></span>
                    </div>

                    <div class="new-form-entry" data-bind="visible: requestingLocationsOff() === false">
                        <label><%: WebResources.ltReferringWorkLocation %>:</label>
                        <%= this.Hidden(m => m.RequestingWorkLocationID)%>
                        <span id="WorkLocationSelect" data-bind="zpSelect: { bind: '[name=RequestingWorkLocationID]', legacyBind: true, source: requestingWorkLocationSource, behavior: 'single', captionText: requestingWorkLocationCaption(), value: requestingWorkLocation, disabled: disableRequestingWorkLocation() || <%= (ReadOnlyBehaviour >= ReadOnlyLevel.OrderLevelOnly).ToJSBool() %> }, validation: { valid: requestingWorkLocation, disabled: disableRequestingWorkLocation() }"></span>
                    </div>

                    <div class="new-form-entry" data-bind="visible: requestingLocationsOff() === false">
                        <label><%: WebResources.ltRequestingLocation %>:</label>
                        <%= this.Hidden(m => m.RequestingLocationID)%>
                        <span id="RequestLocationSelect" data-bind="zpSelect: { bind: '[name=RequestingLocationID]', source: requestingLocationSource, legacyBind: true,  behavior: 'single', captionText: requesterLocationCaption(), value: requestingLocation, disabled: disableRequesterLocation() || <%= (ReadOnlyBehaviour >= ReadOnlyLevel.OrderLevelOnly).ToJSBool() %> }, validation: { valid: requestingLocation, disabled: disableRequesterLocation() }"></span>
                    </div>

                    <div style="clear: left">
                    </div>

                    <div class="new-form-entry">
                        <label><%: WebResources.Column_Orders_DateOfRequest %>:</label>
                        <%= this.DatePickerNullable(m => m.DateOfRequest, "d", new { id="RequestDatePicker", dataBind = "disable: " + (ReadOnlyBehaviour >= ReadOnlyLevel.OrderLevelOnly).ToJSBool() + ",value: dateOfRequest" })%>
                    </div>

                    <div class="new-form-entry">
                        <label><%: WebResources.rep_RetrievalDate%>:</label>
                        <%= this.DatePickerNullable(m => m.RetrievalDate, "d", new { id="RetrevalDateDatePicker", dataBind = "disable: " + (ReadOnlyBehaviour >= ReadOnlyLevel.OrderLevelOnly).ToJSBool() + ", value: retrievalDate" })%>
                    </div>

                    <div class="new-form-entry">
                        <label><%: WebResources.rep_CreationDate %>:</label>
                        <input id="CreationDateTextbox" type="text" class="ui-input readonly-text" disabled="disabled" value="<%= CreationDate %>"/>
                    </div>

                    <div class="new-form-entry">
                        <label><%: WebResources.ltUrgency %>:</label>
                        <%= this.ComboBox(m => m.UrgencyID, OrderController.Urgencies, "ID", "DisplayName", false, new { id="ddUrgency", dataBind = "zpSelect: { bindType: 'id',captionText: 'Select an urgency level ...', disabled: " + (ReadOnlyBehaviour >= ReadOnlyLevel.OrderLevelOnly).ToJSBool() + "}" })%>
                    </div>

                    <div class="new-form-entry" data-bind="<%= string.Format("visible: {0}", (OrderController.OrderTypes.Any() || RisAppSettings.OrderType_PlannedUnplanned).ToJSBool()) %>" >
                        <label><%: WebResources.ltOrderType %>:</label>
                        <%= this.ComboBox(m => m.OrderTypeID, OrderController.OrderTypes, "ID", "DisplayName", true, new { style = "display: none" })%>
                        <span id="RequestTypeSelect" data-bind="zpSelect: { bind: '[name=OrderTypeID]', legacyBind: true, bindType: 'id',  behavior: 'single', captionText: orderTypeCaption(), selectedID: orderType, disabled: <%= (ReadOnlyBehaviour >= ReadOnlyLevel.OrderLevelOnly).ToJSBool() %> }, validation: { valid: orderTypeValid }"></span>
                    </div>

                    <div style="clear: left">
                    </div>

                    <div class="new-form-entry">
                        <label class="new-form-checkbox"><%= this.CheckBox(m => m.SecondCopyRequired, new { dataBind = "checked: secondCopyRequired" })%> <%: WebResources.EditOrder_SecondCopyRequired %></label>
                    </div>

                </div>
            </div>
            <div data-bind="visible: secondCopyRequired">
                <div class="group-panel-title"><%: WebResources.EditOrder_CopyTo %></div>
                <div class="group-panel shaded-panel new-form inline-block-clearfix" style="width: 100%;">
                    <div class="new-form-entry">
                        <label><%: WebResources.EditOrder_CopyToPhysician %>:</label>
                        <%= this.Hidden(m => m.CopyToPhysicianID)%>
                        <span id="CopyToPhysicianSelect" data-bind="zpSelect: { bind: '[name=CopyToPhysicianID]', legacyBind: true, source: copyToPhysicianSource, behavior: 'single', enableSearch: true, captionText: locfmt('{ris,EditOrder_SelectCopyReferrer}'), value: copyToPhysician, disabled: disableCopyToPhysician || <%= (ReadOnlyBehaviour >= ReadOnlyLevel.OrderLevelOnly).ToJSBool() %> }, validation: { valid: copyToPhysician, disabled: disableCopyToPhysician() }"></span>
                    </div>

                    <div class="new-form-entry" data-bind="visible: requestingLocationsOff() === false">
                        <label><%: WebResources.EditOrder_CopyToWorkLocation %>:</label>
                        <%= this.Hidden(m => m.CopyToWorkLocationID)%>
                        <span id="CopyToWorkLocationSelect" data-bind="zpSelect: { bind: '[name=CopyToWorkLocationID]', legacyBind: true, source: copyToWorkLocationSource, behavior: 'single', captionText: copyToWorkLocationCaption(), value: copyToWorkLocation, disabled: disableCopyToWorkLocation() || <%= (ReadOnlyBehaviour >= ReadOnlyLevel.OrderLevelOnly).ToJSBool() %> }, validation: { valid: copyToWorkLocation, disabled: disableCopyToWorkLocation() }"></span>
                    </div>

                    <div class="new-form-entry" data-bind="visible: requestingLocationsOff() === false">
                        <label><%: WebResources.EditOrder_CopyToRequesterLocation %>:</label>
                        <%= this.Hidden(m => m.CopyToRequesterLocationID)%>
                        <span id="CopyToRequesterLocationSelect" data-bind="zpSelect: { bind: '[name=CopyToRequesterLocationID]', source: requestingLocationSource, legacyBind: true,  behavior: 'single', captionText: copyToRequesterLocationCaption(), value: copyToRequesterLocation, disabled: disableCopyToRequesterLocation() || <%= (ReadOnlyBehaviour >= ReadOnlyLevel.OrderLevelOnly).ToJSBool() %> }, validation: { valid: copyToRequesterLocation, disabled: disableCopyToRequesterLocation() }"></span>
                    </div>
                </div>
            </div>
            <div class="group-panel-title"><%: WebResources.ltClinicalInformation %></div>
            <div class="group-panel shaded-panel">
                <div style="padding-bottom: 1px;">
                    <div style="min-height: 5px;">
                        <% if (ClinicalInformationOnExaminationLevel)
                            {
                                if (Model.ExaminationClinicalInformation != null)
                                {
                                    foreach (var examination in Model.ExaminationClinicalInformation)
                                    { %>
                                        <div class="exam-clinical-info-title" style="color: #457;"><%: WebResources.ClinicalInformationForExamination %> <%: examination.ExaminationTypeName %></div>
                                        <div style="margin: 0 5px 8px;">
                                            <%= examination.ClinicalInformaton.ToHtmlEncodedText() %>
                                        </div>
                        <%          }
                                }
                            }
                            else if (!string.IsNullOrEmpty(Model.MedicalIndication))
                            { %>
                                <div style="margin: 5px 5px 8px;"><%= Model.MedicalIndication.ToHtmlEncodedText() %></div>
                        <%  } %>
                    </div>

                    <%= this.TextArea(m => m.AddMedicalIndication, new { id="ClinicalInfoTextbox", style = "width: 100%; resize: none; height: 60px;", dataBind = "disable: " + (ReadOnlyBehaviour >= ReadOnlyLevel.OrderLevelOnly).ToJSBool() })%>
                </div>
            </div>
            <% if ((Model.OrderQandAList != null && Model.OrderQandAList.Any()) || (Model.ExaminationQandAList != null && Model.ExaminationQandAList.Any()))
            { %>
                <div class="group-panel-title"><%: WebResources.DigitalQandA %></div>
                <div class="group-panel shaded-panel">
                    <table style="table-layout: fixed; margin: 5px 5px 6px;">
                        <% if (Model.OrderQandAList != null && Model.OrderQandAList.Any())
                           { %>
                            <tbody>
                                <tr><td colspan="2" style="color: #457; padding-bottom: 3px;"><%: WebResources.DigitalQandAForOrder %></td></tr>
                                <% foreach (var qandA in Model.OrderQandAList)
                                   { %>
                                       <tr><td><%:qandA.Question%>:</td><td style="padding-left: 5px;"><%:qandA.Answer%></td></tr>
                                   <% } %>
                            </tbody>
                        <% } %>

                        <% if (Model.ExaminationQandAList != null && Model.ExaminationQandAList.Any(x => x.QandAList.Any()))
                           { %>
                            <tbody>
                            <%for (int i = 0; i < Model.ExaminationQandAList.Count(); i++)
                                {
                                    var examination = Model.ExaminationQandAList.ToArray()[i];
                                    if ((Model.OrderQandAList != null && Model.OrderQandAList.Any()) || i > 0)
                                    {%>
                                        <tr><td colspan="2" style="height: 14px;"></td></tr>
                                    <% } %>
                                <tr><td colspan="2" style="color: #457; padding-bottom: 3px;"><%: WebResources.DigitalQandAForExamination %> <%:examination.ExaminationTypeName %></td></tr>
                                <% foreach (var qandA in examination.QandAList)
                                { %>
                                    <tr><td><%:qandA.Question %>:</td><td style="padding-left: 5px;"><%:qandA.Answer %></td></tr>
                                <% }
                                } %>
                            </tbody>
                        <% } %>
                    </table>
                </div>
            <% } %>
            <div class="group-panel-title"><%: WebResources.Imaging_OrderMemo %></div>
            <div class="group-panel shaded-panel">
                <div style="padding-bottom: 1px;">
                    <div>
                        <div style="min-height: 5px;">
                            <% if (!string.IsNullOrEmpty(Model.Memo))
                                { %>
                                    <div style="margin: 5px 5px 8px;"><%= Model.Memo.ToHtmlEncodedText() %></div>
                            <%  } %>
                        </div>
                        <%= this.TextArea(m => m.AddMemo, new { id="RequestMemoTextbox", style = "width: 100%; resize: none; height: 60px;", dataBind = "disable: " + (ReadOnlyBehaviour >= ReadOnlyLevel.OrderLevelOnly).ToJSBool() })%>
                    </div>
                </div>
            </div>
            <div class="group-panel-title"><%: WebResources.ltExaminations %></div>
            <div class="group-panel shaded-panel inline-block-clearfix">
                <div id = "ExaminationPanel" runat="server" style="float: left; padding-bottom: 4px;">
                    <asp:UpdatePanel ID="ExaminationsInformationContainer" UpdateMode="Always" runat="server">
                        <ContentTemplate>
                            <RIS:ExaminationsEditControl id="ExaminationsEdit" Width="100%" OnCommandClicked="ExaminationsEdit_OnCommandClicked" OnCommandInitializing="ExaminationsEdit_OnCommandInitializing" runat="server">
                                <Commands>
                                    <RIS:ExaminationEditCommandDefinition CommandID="DeleteCommand" ImageUrl="~/Styles/Default/Images/wrong.png" />
                                    <RIS:ExaminationEditCommandDefinition CommandID="MoveUpCommand" ImageUrl="~/Styles/Default/Images/up.png" />
                                    <RIS:ExaminationEditCommandDefinition CommandID="MoveDownCommand" ImageUrl="~/Styles/Default/Images/down.png" />
                                </Commands>
                                <StatusCommands>
                                    <RIS:ExaminationStatusCommandDefinition CommandID="CancellationReasonEditCommand" Status="CAN" AutoClickOnShow="True" Text="<%$ Resources:WebResources, General_Reason %>" />
                                </StatusCommands>
                            </RIS:ExaminationsEditControl>
                        </ContentTemplate>
                    </asp:UpdatePanel>
                </div>
            </div>
            <% if (ShowFirstPossibilities)
            { %>
                <div class="group-panel-title"><%: WebResources.ltFirstPossibilities %></div>
                <div class="group-panel shaded-panel" style="width: 100%;">
                    <div id="LocationDiv" data-bind="with: possibleLocations" style="min-height: 17px; margin: 5px 5px 6px;">
                        <div data-bind="if: isLoading" style="color: #888;">
                            <%: WebResources.ltCalculateSchedule %>
                        </div>
                        <div data-bind="with: data">
                            <div data-bind="if: Message" style="color: #888;">
                                <span data-bind="text: Message"></span>
                            </div>
                            <dl class="details-list" data-bind="foreach: Locations" style="margin-top: -2px; margin-bottom: -2px;">
                                <dt data-bind="if: Found" style="font-size: 100%; color: black;">
                                    <span data-bind="text: Name"></span>
                                </dt>
                                <dd data-bind="if: Found" style="color: black;">
                                    <span data-bind="text: (Time && moment(Time).fromNow()) || '-'"></span>
                                </dd>
                                <dt data-bind="ifnot: Found" style="font-size: 100%;">
                                    <span class="no-schedule-found" data-bind="text: Name"></span>
                                </dt>
                                <dd data-bind="ifnot: Found">
                                    <span class="no-schedule-found"><%: WebResources.ltNoResultsFound %></span>
                                </dd>
                            </dl>
                        </div>
                    </div>
                </div>
            <% }
            else if (ShowManualBookingData)
            { %>
                <div class="group-panel-title"><%: WebResources.ltSchedule %></div>
                <div class="group-panel shaded-panel" style="width: 100%;">
                    <ul style="padding: 5px 5px 6px 19px; list-style-type: decimal;" >
                        <% foreach (var ai in ManualScheduleInformation)
                           { %>
                            <li>
                                <p>
                                    <span><%= ai.RoomText %></span>
                                    <br/>
                                    <span><%= ai.ScheduleTimeText %></span>
                                </p>
                            </li>
                        <% } %>
                    </ul>
                </div>
            <% }
            else if (Behavior == EditOrderBehavior.ImportOrder)
            { %>
                <div class="group-panel-title"><%: WebResources.EditOrderPage_CompletionDate %></div>
                <div class="group-panel shaded-panel new-form inline-block-clearfix" style="width: 100%;">
                    <div class="inline-block-clearfix" style="padding-bottom: 5px;">
                        <div class="new-form-entry">
                            <%= this.DatePicker(m => m.ImportOrderDate, "d") %>
                        </div>
                        <div class="new-form-entry ui-widget">
                            <span><%: WebResources.ltHours %>:</span>
                            <select id="Hours" style="padding-right: 2px;" runat="server"></select>
                            <span style="margin-left: 8px;"><%: WebResources.ltMinutes %>:</span>
                            <select id="Minutes" style="padding-right: 2px;" runat="server"></select>
                        </div>
                        <div class="new-form-entry">
                            <label class="new-form-checkbox"><%= this.CheckBox(m => m.RetrospectiveBooking) %> <%: WebResources.EditOrderPage_RetrospectiveBooking %></label>
                        </div>
                    </div>
                </div>
            <% } %>
            <div class="ui-helper-clearfix" style="padding-top: 15px;">
                <asp:UpdatePanel ID="ButtonContainer" UpdateMode="Conditional" runat="server">
                    <ContentTemplate>
                        <ul class="button-bar">
                            <li>
                                <% if (CancelOnlyNavigatesBack)
                                   { %>
                                    <button id="BackButton" type="button" class="btn" onclick="beforeClose(); ZillionRis.GoBackToPreviousPage();" ><%: WebResources.General_AbortButton %></button>
                                <% }
                                   else
                                   { %>
                                       <button id="AbortButton" type="button" class="btn" runat="server" onclick="beforeClose();" OnServerClick="CancelButton_OnClick"><%: WebResources.General_AbortButton %></button>
                                <% } %>
                            </li>
                        </ul>
                        <ul class="button-bar right">
                            <% if (ReadOnlyBehaviour < ReadOnlyLevel.OrderLevelOnly)
                            { %>
                            <li>
                                <button ID="ScanRequestFormButton" runat="server" class="btn edit-order-onvalid" type="button" onclick="beforeClose();" OnServerClick="ScanRequestFormButton_OnClick"><%: WebResources.ltScanRequestForm%></button>
                                <asp:CheckBox ID="ScanRequestFormCheckBox" runat="server" Visible="false" Text="<%$ Resources:WebResources, ltScanRequestForm%>" CssClass="new-form-checkbox">
                                </asp:CheckBox>
                                <% if (EnableManualScheduling) { %>
                                    <button ID="BookManualButton" data-bind="click: disableButtons" ClientIDMode="Static" runat="server" class="btn edit-order-onvalid" type="button" onclick="beforeClose();" OnServerClick="BookManualButton_OnClick"><%: WebResources.Button_BookManually%></button>
                                <% } %>
                                <% if (EnableAutomaticScheduling) { %>
                                    <button ID="BookDirectButton" data-bind="click: disableButtons" ClientIDMode="Static" runat="server" class="btn edit-order-onvalid" type="button" onclick="beforeClose();" OnServerClick="BookDirectButton_OnClick"><%: WebResources.Button_BookOrder%></button>
                                <% } %>
                                <button ID="BookOrderNowButton" data-bind="click: disableButtons" ClientIDMode="Static" runat="server" class="btn edit-order-onvalid" type="button" ViewStateMode="Disabled" onclick="beforeClose();" OnServerClick="BookOrderNowButton_OnClick"><%: WebResources.Button_BookOrderNow%></button>
                            </li>
                            <% } %>
                            <% if (ReadOnlyBehaviour != ReadOnlyLevel.Full)
                               { %>
                            <li>
                                <button ID="SaveOrderButton" data-bind="click: disableButtons" ClientIDMode="Static" runat="server" class="btn edit-order-onvalid" type="button" onclick="beforeClose();" OnServerClick="SaveOrderButton_OnClick"><%: WebResources.General_ConfirmButton %></button>
                            </li>
                            <% } %>
                        </ul>
                    </ContentTemplate>
                </asp:UpdatePanel>
            </div>
        </div>
        </div>
    </div>
</asp:content>

(function ($) {
    $.extend(true, window, {
        ZillionRis: {
            Commands: {
                RegisterResources: registerResources
            }
        }
    });

    function registerResources(commandResources) {
        var application = {
            'stored-documents.view': [{ title: locfmt('{ris,CommandStoredDocuments}'), iconClass: { '16': 'zillion-ris app-icon stored-document'} }, { when: '$data.HasStoredDocument', iconClass: { '16': 'zillion-ris app-icon stored-document-active'}}],
            'protocol.open-protocol': [{ title: locfmt('{ris,CommandViewProtocol}'), iconClass: { '16': 'zillion-ris examinations-icon protocol '}}]
        };
        commandResources.assign(application);

        var patient = {
            'patient.contact-information': { title: locfmt('{ris,CommandContactInformation}'), iconClass: { '16': 'zillion-ris patients-icon contact-information'} },
            'patient.edit-patient': { title: locfmt('{ris,CommandPatientDetails}'), iconClass: { '16': 'zillion-ris patients-icon patient-details-16 '} },
            'patient.merge-patient': { title: locfmt('{ris,CommandMergePatient}'), iconClass: { '16': 'zillion-ris patients-icon merge-patient'} },
            'patient.workflow-documents': { title: locfmt('{ris,CommandWorkflowDocuments}'), iconClass: { '16': 'zillion-ris patients-icon merge-patient'} }
        };
        commandResources.assign(patient);

        var order = {
            'order.order-information': { title: locfmt('{ris,CommandOrderInformation}'), iconClass: { '16': 'zillion-ris orders-icon details' } },
            'order.edit-order': { title: locfmt('{ris,CommandEditOrder}'), iconClass: { '16': 'zillion-ris orders-icon edit-order' } },
            'order.open-memo': [{ title: locfmt('{ris,CommandOpenMemo}'), iconClass: { '16': 'zillion-ris orders-icon memo' } }, { when: 'HasMemo', iconClass: { '16': 'zillion-ris orders-icon memo-available' } }],
            'supervisor.open-memo': [{ title: locfmt('{ris,CommandSupervisorMemo}'), iconClass: { '16': 'zillion-ris orders-icon memo' } }, { when: 'HasMemo', iconClass: { '16': 'zillion-ris orders-icon memo-available' } }],
            'order.stored-document': [{ title: locfmt('{ris,CommandOpenRequestForm}'), iconClass: { '16': 'zillion-ris app-icon stored-document' } }, { when: '$data.HasStoredDocument', iconClass: { '16': 'zillion-ris app-icon stored-document-active' } }],
            'order.print-confirmation-letter': { title: locfmt('{ris,CommandPrintConfirmationLetter}'), iconClass: { '16': 'zillion-ris workflow-icon print-page' } },
            'order.print-patient-label': { title: locfmt('{ris,CommandPrintPatientLabel}'), iconClass: { '16': 'zillion-ris workflow-icon print-page' } },
            'order.auto-move-order': { title: locfmt('{ris,CommandAutoMoveOrder}'), iconClass: { '16': 'zillion-ris workflow-icon reschedule' } },
            'order.manual-move-order': { title: locfmt('{ris,CommandManualMoveOrder}'), iconClass: { '16': 'zillion-ris workflow-icon reschedule' } },
            'order.promote-status': { title: locfmt('{ris,CommandPromoteStatus}'), iconClass: { '16': 'zillion-ris workflow-icon promote-status' } },
            'order.demote-status': { title: locfmt('{ris,CommandDemoteStatus}'), iconClass: { '16': 'zillion-ris workflow-icon demote-status' } },
            'order.hold-order': { title: function(c) { return c.Title; }, iconClass: { '16': 'button-sprite held' } },
            'order.unhold-order': { title: locfmt('{ris,UnholdOrderBtn}'), iconClass: { '16': 'button-sprite held' } },
            'order.show-order-appointment': { title: locfmt('{ris,PrintAppointmentTitle}'), iconClass: { '16': 'zillion-ris workflow-icon print-page' } },
            'order.change-urgency': { title: locfmt('{ris,ChangeUrgency}'), iconClass: { '16': 'zillion-ris app-icon change-urgency' } },
            'order.scan-document': { title: locfmt('{ris,CommandScanDocument}'), iconClass: { '16': 'zillion-ris app-icon stored-document' } },
            'order.view-audit-trail': { title: locfmt('{ris,CommandViewAuditTrail}'), iconClass: { '16': 'zillion-ris orders-icon audittrail' } },
            'order.set-kiosk-check-in-not-allowed': [{ title: locfmt('{ris,CommandAllowKioskCheckIn}') }, { when: 'KioskCheckInNotAllowed', title: locfmt('{ris,CommandDoNotAllowKioskCheckIn}') }]
        };
        commandResources.assign(order);

        var examination = {
            'examination.cancel': [{ title: locfmt('{ris,CancelExamination}'), iconClass: { '16': 'zillion-ris workflow-icon declined'} }, { when: 'Title', title: function (c) { return c.Title; } }],
            'examination.decline-examination': { title: locfmt('{ris,Decline}'), iconClass: { '16': 'fa fa-thumbs-down'} },
            'examination.change-intended-radiologist': { title: locfmt('{ris,ChangeIntendedRadiologistPopup_Title}'), iconClass: { '16': 'zillion-ris examinations-icon examination-assignments '} },
            'examination.change-assignments': { title: locfmt('{ris,CommandChangeAssignments}'), iconClass: { '16': 'zillion-ris examinations-icon examination-assignments '} },
            'examination.open-memo': [{ title: locfmt('{ris,CommandOpenMemo}'), iconClass: { '16': 'zillion-ris orders-icon memo'} }, { when: 'HasMemo', iconClass: { '16': 'zillion-ris orders-icon memo-available'}}],
            'examination.view-images': [{ title: locfmt('{ris,CommandViewImages}'), iconClass: { '16': 'zillion-ris patients-icon search-patient'}}],
            'examination.add-image': [{ title: locfmt('{ris,CommandAddImage}'), iconClass: { '16': 'zillion-ris patients-icon search-patient'}}],
            'examination.complication-form': [{ title: locfmt('{ris,CommandComplicationForm}'), iconClass: { '16': 'zillion-ris examinations-icon indication-form '}}],
            'examination.indicator-form': [{ title: locfmt('{ris,CommandIndicatorForm}'), iconClass: { '16': 'zillion-ris examinations-icon indication-form '}}],
            'examination.open-report': [{ title: locfmt('{ris,CommandOpenReportDictated}'), iconClass: { '16': 'zillion-ris examinations-icon report-dictated'} },
                                        { when: ZillionRis.ShowReportTranscribedIcon, title: locfmt('{ris,CommandOpenReportTranscribed}'), iconClass: { '16': 'zillion-ris examinations-icon report-transcribed'} },
                                        { when: ZillionRis.ShowReportAuthorizedIcon, title: locfmt('{ris,CommandOpenReportAuthorized}'), iconClass: { '16': 'zillion-ris examinations-icon report-authorized'}}],
            'examination.move-to-discussion': [{ title: locfmt('{ris,CommandMoveToDiscussion}'), iconClass: { '16': 'zillion-ris workflow-icon send-to '}}],
            'examination.send-to-failsafe': [{ title: locfmt('{ris,CommandSendToFailSafe}'), iconClass: { '16': 'zillion-ris workflow-icon send-to ' } }],
            'examination.cancel-failsafe': { title: locfmt('{ris,CommandCancelFailSafe}') },
            'examination.create-addendum': { title: locfmt('{ris,CommandAddAddendum}') },
            'examination.cancel-addendum': { title: locfmt('{ris,CommandCancelAddendum}') },
            'examination.housekeeping-state': { title: locfmt('{ris,HousekeepingState}'), iconClass: { '16': 'zillion-ris workflow-icon broom'} },
            'examination.send-to-housekeeping': { title: locfmt('{ris,CommandSendToHousekeeping}'), iconClass: { '16': 'zillion-ris workflow-icon broom'} },
            'examination.remove-from-housekeeping': { title: locfmt('{ris,CommandCancelHousekeeping}'), iconClass: { '16': 'zillion-ris workflow-icon broom'} },
            'examination.auto-move-examination': { title: locfmt('{ris,CommandAutoMoveExamination}'), iconClass: { '16': 'zillion-ris workflow-icon reschedule'} },
            'examination.manual-move-examination': { title: locfmt('{ris,CommandManualMoveExamination}'), iconClass: { '16': 'zillion-ris workflow-icon reschedule'} },
            'examination.promote-status': { title: locfmt('{ris,CommandPromoteStatus}'), iconClass: { '16': 'zillion-ris workflow-icon promote-status'} },
            'examination.demote-status': { title: locfmt('{ris,CommandDemoteStatus}'), iconClass: { '16': 'zillion-ris workflow-icon demote-status'} },
            'examination.add-intended-vetter': { title: locfmt('{ris,AssignIntendedApprover}'), iconClass: { '16': 'zillion-ris examinations-icon examination-assignments'} },
            'examination.view-qandaforms': { title: locfmt('{ris,CommandViewQandAForms}'), iconClass: { '16': 'zillion-ris app-icon stored-document'} },
            'examination.cancel-appointment-and-hold-order': { title: 'Cancel appointment and hold order', iconClass: { '16': 'zillion-ris workflow-icon broom'} },
            'examination.correct-administration-errors': { title: locfmt('{ris,CommandCorrectAdministrationErrors}'), iconClass: { '16': 'zillion-ris workflow-icon broom' } },
            'examination.open-failsafe': { title: locfmt('{ris,CommandFailsafe}'), iconClass: { '16': 'zillion-ris examinations-icon failsafe'} }
        };
        commandResources.assign(examination);


        var imaging = {
            'imaging.order.pending-intermediate-request': { title: locfmt('{ris,Imaging_PendingIntermediateRequest}'), iconClass: { '16': 'zillion-ris workflow-icon pending'} },
            'imaging.examination.not-performed': { title: locfmt('{ris,Imaging_NotPerformed}'), iconClass: { '16': 'zillion-ris workflow-icon declined'} },
            'imaging.examination.set-status-to-in-department': { title: locfmt('{ris,Imaging_MoveBack}'), iconClass: { '16': 'zillion-ris workflow-icon demote-status'} },
            'imaging.order.set-status-to-in-department': { title: locfmt('{ris,Imaging_MoveOrderBack}'), iconClass: { '16': 'zillion-ris workflow-icon demote-status'} },
            'imaging.order.set-status-to-in-progress': { title: locfmt('{ris,Imaging_TakeOrder}'), iconClass: { '16': 'zillion-ris workflow-icon promote-status'} },
            'imaging.study.complete': { title: locfmt('{ris,Imaging_CompleteExamination}'), iconClass: { '16': 'zillion-ris workflow-icon promote-status'} },
            'imaging.study.completed-state': { title: locfmt('{ris,Imaging_ExaminationCompleted}'), iconClass: { '16': 'zillion-ris workflow-icon accepted'} },
            'imaging.study.create-intermediate-request': { title: locfmt('{ris,Imaging_CreateIntermediateRequest}'), iconClass: { '16': 'zillion-ris workflow-icon send-to'} },
            'imaging.study.cancel-intermediate-request': { title: locfmt('{ris,Imaging_CancelIntermediateRequest}'), iconClass: { '16': 'zillion-ris workflow-icon pending'} },
            'imaging.study.accept-intermediate-response-accepted': { title: locfmt('{ris,Imaging_AcceptIntermediateResponseAccepted}'), iconClass: { '16': 'zillion-ris workflow-icon accepted'} },
            'imaging.study.accept-intermediate-response-declined': { title: locfmt('{ris,Imaging_AcceptIntermediateResponseDeclined}'), iconClass: { '16': 'zillion-ris workflow-icon declined'} }
        };
        commandResources.assign(imaging);

        var speechstate = {
            'speechstate.change-speech-state': { title: locfmt('{ris,CommandChangeSpeechState}'), iconClass: { '16': 'zillion-ris workflow-icon send-to'} },
            'speechstate.cancel-speech-state': { title: locfmt('{ris,CommandCancelSpeechState}'), iconClass: { '16': 'zillion-ris workflow-icon send-to'} },
            'supervision.req-supervision-before-dict': { title: locfmt('{ris,Supervision_SendToSupervisor}'), iconClass: { '16': 'zillion-ris workflow-icon send-to'} }
        };
        commandResources.assign(speechstate);
    }
})(jQuery);

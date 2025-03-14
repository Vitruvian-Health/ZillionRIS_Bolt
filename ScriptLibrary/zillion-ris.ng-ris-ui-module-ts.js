/// <reference path="../../rogan.zillionris.javascript/scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../rogan.zillionris.javascript/scripts/typings/ris/zillion-ris.d.ts" />
/// <reference path="../../rogan.zillionris.javascript/scripts/typings/zillionparts/zillion-parts.d.ts" />
var ZillionRisNgUi;
(function (ZillionRisNgUi) {
    var ConfigurationMenuCtrl = /** @class */ (function () {
        function ConfigurationMenuCtrl($scope, $timeout, $element, $attrs) {
            var menuItemIds = $attrs['configurationMenuItems'] || ConfigurationMenuCtrl.defaultMenuItemIds;
            $timeout(function () {
                $('input', $element)
                    .configurationMenu({
                    items: menuItemIds.split(',').qSelect(ConfigurationMenuCtrl.mapIdToItem),
                    onSelect: function (item) {
                        $scope.$broadcast($attrs['configurationMenu'] + ".select", item.id);
                    }
                });
            }, 0);
        }
        ConfigurationMenuCtrl.mapIdToItem = function (id) {
            switch (id) {
                case 'refresh':
                    return {
                        text: locfmt('{ris,ContextMenu_Refresh}'),
                        id: 'refresh',
                        iconClass: 'zillion-ris app-icon refresh'
                    };
                case 'clear-filter':
                    return {
                        text: locfmt('{ris,ContextMenu_ClearFilter}'),
                        id: 'clear-filter',
                        iconClass: ''
                    };
                case 'configure':
                    return {
                        text: locfmt('{ris,ContextMenu_ConfigureColumns}'),
                        id: 'configure',
                        iconClass: 'zillion-ris app-icon customize-table'
                    };
                case 'reset':
                    return {
                        text: locfmt('{ris,ContextMenu_DefaultSettings}'),
                        id: 'reset',
                        iconClass: 'ui-icon ui-icon-refresh'
                    };
                default:
                    throw new Error("Unknow configuration menu item id: " + id);
            }
        };
        ConfigurationMenuCtrl.$inject = ['$scope', '$timeout', '$element', '$attrs'];
        ConfigurationMenuCtrl.defaultMenuItemIds = 'refresh,clear-filter,configure,reset';
        return ConfigurationMenuCtrl;
    }());
    angular
        .module('ui.ris')
        .directive('gridTitle', function () {
        return {
            template: '<span class="group-panel-title">{{gridTitle}}<span ng-if="resultCounts"> ({{resultCounts.shown}}/{{resultCounts.total}})</span></span>',
            scope: {
                gridTitle: '@',
                resultCounts: '=?'
            }
        };
    })
        .directive('configurationMenu', function () { return ({
        controller: ConfigurationMenuCtrl,
        template: '<input type="button" class="ui-custom-button command-button ui-link"/>',
        scope: false
    }); });
})(ZillionRisNgUi || (ZillionRisNgUi = {}));
//# sourceMappingURL=zillion-ris.ng-ris-ui-module-ts.js.map
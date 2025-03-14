/// <reference path="../../rogan.zillionris.javascript/scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../rogan.zillionris.javascript/scripts/typings/ris/zillion-ris.d.ts" />
/// <reference path="../../rogan.zillionris.javascript/scripts/typings/zillionparts/zillion-parts.d.ts" />

namespace ZillionRisNgUi {

    class ConfigurationMenuCtrl {
        public static $inject = ['$scope', '$timeout', '$element', '$attrs'];
        public constructor($scope: angular.IScope, $timeout: angular.ITimeoutService, $element: JQuery, $attrs: angular.IAttributes) {

            var menuItemIds = <string>$attrs['configurationMenuItems'] || ConfigurationMenuCtrl.defaultMenuItemIds;

            $timeout(() => {
                $('input', $element)
                    .configurationMenu({
                        items: menuItemIds.split(',').qSelect(ConfigurationMenuCtrl.mapIdToItem),
                        onSelect: item => {
                            $scope.$broadcast(`${$attrs['configurationMenu']}.select`, item.id);
                        }
                    });
            }, 0);
        }
        
        static defaultMenuItemIds = 'refresh,clear-filter,configure,reset';

        static mapIdToItem(id: string) {
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
                    throw new Error(`Unknow configuration menu item id: ${id}`);
            }
        }
    }

    angular
        .module('ui.ris')
        .directive('gridTitle', () => {
            return {
                template: '<span class="group-panel-title">{{gridTitle}}<span ng-if="resultCounts"> ({{resultCounts.shown}}/{{resultCounts.total}})</span></span>',
                scope: {
                    gridTitle: '@',
                    resultCounts: '=?'
                }
            };
        })
        .directive('configurationMenu', () => ({
            controller: ConfigurationMenuCtrl,
            template: '<input type="button" class="ui-custom-button command-button ui-link"/>',
            scope: false
        }));
}

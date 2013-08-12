/*Contains multiple services for various helper tasks */

/**
 * @ngdoc function
 * @name umbraco.services.legacyJsLoader
 * @function
 *
 * @description
 * Used to lazy load in any JS dependencies that need to be manually loaded in
 */
function legacyJsLoader(assetsService, umbRequestHelper) {
    return {
        
        /** Called to load in the legacy tree js which is required on startup if a user is logged in or 
         after login, but cannot be called until they are authenticated which is why it needs to be lazy loaded. */
        loadLegacyTreeJs: function(scope) {
            return assetsService.loadJs(umbRequestHelper.getApiUrl("legacyTreeJs", "", ""), scope);
        }  
    };
}
angular.module('umbraco.services').factory('legacyJsLoader', legacyJsLoader);

/**
 * @ngdoc service
 * @name umbraco.services.angularHelper
 * @function
 *
 * @description
 * Some angular helper/extension methods
 */
function angularHelper($log, $q) {
    return {
        
        /**
         * @ngdoc function
         * @name umbraco.services.angularHelper#rejectedPromise
         * @methodOf umbraco.services.angularHelper
         * @function
         *
         * @description
         * In some situations we need to return a promise as a rejection, normally based on invalid data. This
         * is a wrapper to do that so we can save one writing a bit of code.
         *
         * @param {object} objReject The object to send back with the promise rejection
         */
        rejectedPromise: function (objReject) {
            var deferred = $q.defer();
            //return an error object including the error message for UI
            deferred.reject(objReject);
            return deferred.promise;
        },

        /**
         * @ngdoc function
         * @name safeApply
         * @methodOf umbraco.services.angularHelper
         * @function
         *
         * @description
         * This checks if a digest/apply is already occuring, if not it will force an apply call
         */
        safeApply: function (scope, fn) {
            if (scope.$$phase || scope.$root.$$phase) {
                if (angular.isFunction(fn)) {
                    fn();
                }
            }
            else {
                if (angular.isFunction(fn)) {
                    scope.$apply(fn);
                }
                else {
                    scope.$apply();
                }
            }
        },
        
        /**
         * @ngdoc function
         * @name getCurrentForm
         * @methodOf umbraco.services.angularHelper
         * @function
         *
         * @description
         * Returns the current form object applied to the scope or null if one is not found
         */
        getCurrentForm: function (scope) {

            //NOTE: There isn't a way in angular to get a reference to the current form object since the form object
            // is just defined as a property of the scope when it is named but you'll always need to know the name which
            // isn't very convenient. If we want to watch for validation changes we need to get a form reference.
            // The way that we detect the form object is a bit hackerific in that we detect all of the required properties 
            // that exist on a form object.
            //
            //The other way to do it in a directive is to require "^form", but in a controller the only other way to do it
            // is to inject the $element object and use: $element.inheritedData('$formController');

            var form = null;
            //var requiredFormProps = ["$error", "$name", "$dirty", "$pristine", "$valid", "$invalid", "$addControl", "$removeControl", "$setValidity", "$setDirty"];
            var requiredFormProps = ["$addControl", "$removeControl", "$setValidity", "$setDirty", "$setPristine"];

            // a method to check that the collection of object prop names contains the property name expected
            function propertyExists(objectPropNames) {
                //ensure that every required property name exists on the current scope property
                return _.every(requiredFormProps, function (item) {
                    
                    return _.contains(objectPropNames, item);
                });
            }

            for (var p in scope) {

                if (_.isObject(scope[p]) && p !== "this" && p.substr(0, 1) !== "$") {
                    //get the keys of the property names for the current property
                    var props = _.keys(scope[p]);
                    //if the length isn't correct, try the next prop
                    if (props.length < requiredFormProps.length) {
                        continue;
                    }

                    //ensure that every required property name exists on the current scope property
                    var containProperty = propertyExists(props);

                    if (containProperty) {
                        form = scope[p];
                        break;
                    }
                }
            }

            return form;
        },
        
        /**
         * @ngdoc function
         * @name validateHasForm
         * @methodOf umbraco.services.angularHelper
         * @function
         *
         * @description
         * This will validate that the current scope has an assigned form object, if it doesn't an exception is thrown, if
         * it does we return the form object.
         */
        getRequiredCurrentForm: function(scope) {
            var currentForm = this.getCurrentForm(scope);
            if (!currentForm || !currentForm.$name) {
                throw "The current scope requires a current form object (or ng-form) with a name assigned to it";
            }
            return currentForm;
        },
        
        /**
         * @ngdoc function
         * @name getNullForm
         * @methodOf umbraco.services.angularHelper
         * @function
         *
         * @description
         * Returns a null angular FormController, mostly for use in unit tests
         *      NOTE: This is actually the same construct as angular uses internally for creating a null form but they don't expose
         *          any of this publicly to us, so we need to create our own.
         *
         * @param {string} formName The form name to assign
         */
        getNullForm: function(formName) {
            return {
                $addControl: angular.noop,
                $removeControl: angular.noop,
                $setValidity: angular.noop,
                $setDirty: angular.noop,
                $setPristine: angular.noop,
                $name: formName
                //NOTE: we don't include the 'properties', just the methods.
            };
        }
    };
}
angular.module('umbraco.services').factory('angularHelper', angularHelper);

/**
* @ngdoc service
* @name umbraco.services.umbPropertyEditorHelper
* @description A helper object used for property editors
**/
function umbPropEditorHelper() {
    return {
        /**
     * @ngdoc function
     * @name getImagePropertyValue
     * @methodOf umbraco.services.umbPropertyEditorHelper
     * @function    
     *
     * @description
     * Returns the correct view path for a property editor, it will detect if it is a full virtual path but if not then default to the internal umbraco one
     * 
     * @param {string} input the view path currently stored for the property editor
     */
        getViewPath: function (input) {
            var path = String(input);
            if (path.startsWith('/')) {
                return path;
            }
            else {
                var pathName = path.replace('.', '/');
                //i.e. views/propertyeditors/fileupload/fileupload.html
                return "views/propertyeditors/" + pathName + "/" + pathName + ".html";
            }
        }
    };
}
angular.module('umbraco.services').factory('umbPropEditorHelper', umbPropEditorHelper);

/**
* @ngdoc service
* @name umbraco.services.umbImageHelper
* @description A helper object used for parsing image paths
**/
function umbImageHelper() {
    return {
        /** Returns the actual image path associated with the image property if there is one */
        getImagePropertyVaue: function(options) {
            if (!options && !options.imageModel && !options.scope) {
                throw "The options objet does not contain the required parameters: imageModel, scope";
            }
            if (options.imageModel.contentTypeAlias.toLowerCase() === "image") {
                var imageProp = _.find(options.imageModel.properties, function (item) {
                    return item.alias === 'umbracoFile';
                });
                var imageVal;

                //our default images might store one or many images (as csv)
                var split = imageProp.value.split(',');
                var self = this;
                imageVal = _.map(split, function(item) {
                    return { file: item, isImage: self.detectIfImageByExtension(item) };
                });
                
                //for now we'll just return the first image in the collection.
                //TODO: we should enable returning many to be displayed in the picker if the uploader supports many.
                if (imageVal.length && imageVal.length > 0 && imageVal[0].isImage) {
                    return imageVal[0].file;
                }
            }
            return "";
        },
        /** formats the display model used to display the content to the model used to save the content */
        getThumbnail: function (options) {
            
            if (!options && !options.imageModel && !options.scope) {
                throw "The options objet does not contain the required parameters: imageModel, scope";
            }

            var imagePropVal = this.getImagePropertyVaue(options);
            if (imagePropVal !== "") {
                return this.getThumbnailFromPath(imagePropVal);
            }
            return "";
        },
        getThumbnailFromPath: function(imagePath) {
            var ext = imagePath.substr(imagePath.lastIndexOf('.'));
            return imagePath.substr(0, imagePath.lastIndexOf('.')) + "_thumb" + ".jpg";
        },
        detectIfImageByExtension: function(imagePath) {
            var lowered = imagePath;
            var ext = lowered.substr(lowered.lastIndexOf(".") + 1);
            return ("," + Umbraco.Sys.ServerVariables.umbracoSettings.imageFileTypes + ",").indexOf("," + ext + ",") !== -1;
        }
    };
}
angular.module('umbraco.services').factory('umbImageHelper', umbImageHelper);

/**
* @ngdoc service
* @name umbraco.services.umbDataFormatter
* @description A helper object used to format/transform JSON Umbraco data, mostly used for persisting data to the server
**/
function umbDataFormatter() {
    return {
        
        /** formats the display model used to display the content to the model used to save the content */
        formatContentPostData: function (displayModel, action) {
            //NOTE: the display model inherits from the save model so we can in theory just post up the display model but 
            // we don't want to post all of the data as it is unecessary.
            var saveModel = {
                id: displayModel.id,
                properties: [],
                name: displayModel.name,
                contentTypeAlias : displayModel.contentTypeAlias,
                parentId: displayModel.parentId,
                //set the action on the save model
                action: action
            };
            
            _.each(displayModel.tabs, function (tab) {
                
                _.each(tab.properties, function (prop) {
                    
                    //don't include the custom generic tab properties
                    if (!prop.alias.startsWith("_umb_")) {
                        saveModel.properties.push({
                            id: prop.id,
                            alias: prop.alias,
                            value: prop.value
                        });
                    }
                    else {
                        //here we need to map some of our internal properties to the content save item

                        switch (prop.alias) {
                            case "_umb_expiredate":
                                saveModel.expireDate = prop.value;
                                break;
                            case "_umb_releasedate":
                                saveModel.releaseDate = prop.value;
                                break;
                            case "_umb_template":
                                //this will be a json string
                                var json = angular.toJson(prop.value);
                                saveModel.templateAlias = json.alias;
                                break;
                        }
                    }
                    
                });
            });

            return saveModel;
        }
    };
}
angular.module('umbraco.services').factory('umbDataFormatter', umbDataFormatter);

/**
* @ngdoc service
* @name umbraco.services.iconHelper
* @description A helper service for dealing with icons, mostly dealing with legacy tree icons
**/
function iconHelper() {

    var converter = [
        { oldIcon: ".sprNew", newIcon: "plus" },
        { oldIcon: ".sprDelete", newIcon: "remove" },
        { oldIcon: ".sprMove", newIcon: "move" },
        { oldIcon: ".sprCopy", newIcon: "copy" },
        { oldIcon: ".sprSort", newIcon: "sort" },
        { oldIcon: ".sprPublish", newIcon: "globe" },
        { oldIcon: ".sprRollback", newIcon: "undo" },
        { oldIcon: ".sprProtect", newIcon: "lock" },
        { oldIcon: ".sprAudit", newIcon: "time" },
        { oldIcon: ".sprNotify", newIcon: "envelope" },
        { oldIcon: ".sprDomain", newIcon: "home" },
        { oldIcon: ".sprPermission", newIcon: "group" },
        { oldIcon: ".sprRefresh", newIcon: "refresh" },
        { oldIcon: ".sprBinEmpty", newIcon: "trash" },
        { oldIcon: ".sprExportDocumentType", newIcon: "download-alt" },
        { oldIcon: ".sprImportDocumentType", newIcon: "upload-alt" },
        { oldIcon: ".sprLiveEdit", newIcon: "edit" },
        { oldIcon: ".sprCreateFolder", newIcon: "plus-sign-alt" },
        { oldIcon: ".sprPackage2", newIcon: "gift" },
        { oldIcon: ".sprLogout", newIcon: "signout" },
        { oldIcon: ".sprSave", newIcon: "save" },
        { oldIcon: ".sprSendToTranslate", newIcon: "envelope-alt" },
        { oldIcon: ".sprToPublish", newIcon: "mail-forward" },
        { oldIcon: ".sprTranslate", newIcon: "comments" },
        { oldIcon: ".sprUpdate", newIcon: "save" },
        
        { oldIcon: ".sprTreeSettingDomain", newIcon: "icon-home" },
        { oldIcon: ".sprTreeDoc", newIcon: "icon-file-alt" },
        { oldIcon: ".sprTreeDoc2", newIcon: "icon-file" },
        { oldIcon: ".sprTreeDoc3", newIcon: "icon-file-text" },
        { oldIcon: ".sprTreeDoc4", newIcon: "icon-file-text-alt" },
        { oldIcon: ".sprTreeDoc5", newIcon: "icon-book" },        
        { oldIcon: ".sprTreeDocPic", newIcon: "icon-picture" },        
        { oldIcon: ".sprTreeFolder", newIcon: "icon-folder-close" },
        { oldIcon: ".sprTreeFolder_o", newIcon: "icon-folder-open" },
        { oldIcon: ".sprTreeMediaFile", newIcon: "icon-music" },
        { oldIcon: ".sprTreeMediaMovie", newIcon: "icon-movie" },
        { oldIcon: ".sprTreeMediaPhoto", newIcon: "icon-picture" },
        
        { oldIcon: ".sprTreeMember", newIcon: "icon-mail" },
        { oldIcon: ".sprTreeMemberGroup", newIcon: "icon-group" },
        { oldIcon: ".sprTreeMemberType", newIcon: "icon-group" },
        
        { oldIcon: ".sprTreeNewsletter", newIcon: "icon-file-text-alt" },
        { oldIcon: ".sprTreePackage", newIcon: "icon-dropbox" },
        { oldIcon: ".sprTreeRepository", newIcon: "icon-github" },
        
        //TODO:
        /*
        { oldIcon: ".sprTreeSettingAgent", newIcon: "" },
        { oldIcon: ".sprTreeSettingCss", newIcon: "" },
        { oldIcon: ".sprTreeSettingCssItem", newIcon: "" },
        { oldIcon: ".sprTreeSettingDataType", newIcon: "" },
        { oldIcon: ".sprTreeSettingDataTypeChild", newIcon: "" },
        { oldIcon: ".sprTreeSettingDomain", newIcon: "" },
        { oldIcon: ".sprTreeSettingLanguage", newIcon: "" },
        { oldIcon: ".sprTreeSettingScript", newIcon: "" },
        { oldIcon: ".sprTreeSettingTemplate", newIcon: "" },
        { oldIcon: ".sprTreeSettingXml", newIcon: "" },
        { oldIcon: ".sprTreeStatistik", newIcon: "" },
        { oldIcon: ".sprTreeUser", newIcon: "" },
        { oldIcon: ".sprTreeUserGroup", newIcon: "" },
        { oldIcon: ".sprTreeUserType", newIcon: "" },
        */


        { oldIcon: ".sprTreeDeveloperCacheItem", newIcon: "icon-box" },
        { oldIcon: ".sprTreeDeveloperCacheTypes", newIcon: "icon-box" },
        { oldIcon: ".sprTreeDeveloperMacro", newIcon: "icon-cogs" },
        { oldIcon: ".sprTreeDeveloperRegistry", newIcon: "icon-windows" },
        { oldIcon: ".sprTreeDeveloperPython", newIcon: "icon-linux" },
        
        
        //tray icons
        { oldIcon: ".traycontent", newIcon: "traycontent" },
        { oldIcon: ".traymedia", newIcon: "traymedia" },
        { oldIcon: ".traysettings", newIcon: "traysettings" },
        { oldIcon: ".traydeveloper", newIcon: "traydeveloper" },
        { oldIcon: ".trayusers", newIcon: "trayusers" },
        { oldIcon: ".traymember", newIcon: "traymember" },
        { oldIcon: ".traytranslation", newIcon: "traytranslation" }
    ];

    return {
        
        /** Used by the create dialogs for content/media types to format the data so that the thumbnails are styled properly */
        formatContentTypeThumbnails: function (contentTypes) {
            for (var i = 0; i < contentTypes.length; i++) {
                if (contentTypes[i].thumbnailIsClass === undefined || contentTypes[i].thumbnailIsClass) {
                    contentTypes[i].cssClass = this.convertFromLegacyIcon(contentTypes[i].thumbnail);
                }
                else {
                    contentTypes[i].style = "background-image: url('" + contentTypes[i].thumbnailFilePath + "');height:36px; background-position:4px 0px; background-repeat: no-repeat;background-size: 35px 35px;";
                    //we need an 'icon-' class in there for certain styles to work so if it is image based we'll add this
                    contentTypes[i].cssClass = "custom-file";
                }
            }
            return contentTypes;
        },

        /** If the icon is file based (i.e. it has a file path) */
        isFileBasedIcon: function (icon) {
            //if it doesn't start with a '.' but contains one then we'll assume it's file based
            if (!icon.startsWith('.') && icon.indexOf('.') > 1) {
                return true;
            }
            return false;
        },
        /** If the icon is legacy */
        isLegacyIcon: function (icon) {
            if (icon.startsWith('.')) {
                return true;
            }
            return false;
        },
        /** If the tree node has a legacy icon */
        isLegacyTreeNodeIcon: function(treeNode){
            if (treeNode.iconIsClass) {
                return this.isLegacyIcon(treeNode.icon);
            }
            return false;
        },
        /** Converts the icon from legacy to a new one if an old one is detected */
        convertFromLegacyIcon: function (icon) {
            if (this.isLegacyIcon(icon)) {
                //its legacy so convert it if we can
                var found = _.find(converter, function (item) {
                    return item.oldIcon.toLowerCase() === icon.toLowerCase();
                });
                return (found ? found.newIcon : icon);
            }
            return icon;
        },
        /** If we detect that the tree node has legacy icons that can be converted, this will convert them */
        convertFromLegacyTreeNodeIcon: function (treeNode) {
            if (this.isLegacyTreeNodeIcon(treeNode)) {
                return this.convertFromLegacyIcon(treeNode.icon);
            }
            return treeNode.icon;
        }
    };
}
angular.module('umbraco.services').factory('iconHelper', iconHelper);
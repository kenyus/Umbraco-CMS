function mediaEditController($scope, $routeParams, mediaResource, notificationsService, angularHelper, serverValidationManager, contentEditingHelper) {

    if ($routeParams.create) {

        mediaResource.getScaffold($routeParams.id, $routeParams.doctype)
            .then(function (data) {
                $scope.contentLoaded = true;
                $scope.content = data;
            });
    }
    else {
        mediaResource.getById($routeParams.id)
            .then(function (data) {
                $scope.contentLoaded = true;
                $scope.content = data;
                
                //in one particular special case, after we've created a new item we redirect back to the edit
                // route but there might be server validation errors in the collection which we need to display
                // after the redirect, so we will bind all subscriptions which will show the server validation errors
                // if there are any and then clear them so the collection no longer persists them.
                serverValidationManager.executeAndClearAllSubscriptions();

            });
    }

    $scope.files = [];
    $scope.addFiles = function (propertyId, files) {
        //this will clear the files for the current property and then add the new ones for the current property
        $scope.files = _.reject($scope.files, function (item) {
            return item.id == propertyId;
        });
        for (var i = 0; i < files.length; i++) {
            //save the file object to the scope's files collection
            $scope.files.push({ id: propertyId, file: files[i] });
        }
    };
    
    //ensure there is a form object assigned.
    var currentForm = angularHelper.getRequiredCurrentForm($scope);
   
    $scope.save = function (cnt) {
        
        $scope.$broadcast("saving", { scope: $scope });

        //don't continue if the form is invalid
        if (currentForm.$invalid) return;
        
        serverValidationManager.reset();

        mediaResource.saveMedia(cnt, $routeParams.create, $scope.files)
            .then(function (data) {
                contentEditingHelper.handleSuccessfulSave({
                    scope: $scope,
                    newContent: data
                });
            }, function (err) {
                contentEditingHelper.handleSaveError(err, $scope);
            });
    };
}

angular.module("umbraco")
    .controller("Umbraco.Editors.MediaEditController", mediaEditController);
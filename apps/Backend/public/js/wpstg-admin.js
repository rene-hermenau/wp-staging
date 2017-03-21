"use strict";

var WPStaging = (function($)
{
    var that        = {
            isCancelled : false,
            isFinished  : false,
            getLogs     : false
        },
        cache       = {elements : []},
        ajaxSpinner;

    /**
     * Get / Set Cache for Selector
     * @param {String} selector
     * @returns {*}
     */
    cache.get           = function(selector)
    {
        // It is already cached!
        if ($.inArray(selector, cache.elements) !== -1)
        {
            return cache.elements[selector];
        }

        // Create cache and return
        cache.elements[selector] = jQuery(selector);

        return cache.elements[selector];
    };

    /**
     * Refreshes given cache
     * @param {String} selector
     */
    cache.refresh       = function(selector)
    {
        selector.elements[selector] = jQuery(selector);
    };

    /**
     * Show and Log Error Message
     * @param {String} message
     */
    var showError       = function(message)
    {
        cache.get("#wpstg-try-again").css("display", "inline-block");
        cache.get("#wpstg-cancel-cloning").text("Reset");
        cache.get("#wpstg-cloning-result").text("Fail");
        cache.get("#wpstg-error-wrapper").show();
        cache.get("#wpstg-error-details")
            .show()
            .html(message);

        cache.get("#wpstg-loader").hide();

        // Log error message on
        if (false === wpstg.settings.isDebugMode)
        {
            return;
        }

        $.post(
            ajaxurl,
            {
                action  : "wpstg_error_processing",
                message : message
            }
        );
    };

    /**
     * Common Elements
     */
    var elements        = function()
    {
        var $workFlow       = cache.get("#wpstg-workflow"),
            isAllChecked    = true,
            urlSpinner      = ajaxurl.replace("/admin-ajax.php", '') + "/images/spinner",
            timer;

        if (2 < window.devicePixelRatio)
        {
            urlSpinner += "-2x";
        }

        urlSpinner += ".gif";

        ajaxSpinner = "<img src=''" + urlSpinner + "' alt='' class='ajax-spinner general-spinner' />";

        $workFlow
            // Check / Un-check Database Tables
            .on("click", ".wpstg-button-unselect", function (e) {
                e.preventDefault();

                if (false === isAllChecked)
                {
                    cache.get(".wpstg-db-table-checkboxes").prop("checked", true);
                    cache.get(".wpstg-button-unselect").text("Un-check All");
                    isAllChecked = true;
                }
                else
                {
                    cache.get(".wpstg-db-table-checkboxes").prop("checked", false);
                    cache.get(".wpstg-button-unselect").text("Check All");
                    isAllChecked = false;
                }
            })
            // Expand Directories
            .on("click", ".wpstg-expand-dirs", function (e) {
                e.preventDefault();

                var $this = $(this);

                if (!$this.hasClass("disabled"))
                {
                    $this.siblings(".wpstg-subdir").slideToggle();
                }
            })
            // When a Directory is Selected
            .on("change", ".wpstg-check-dir", function () {
                var $directory = $(this).parent(".wpstg-dir");

                if (this.checked)
                {
                    $directory.parents(".wpstg-dir").children(".wpstg-check-dir").prop("checked", true);
                    $directory.find(".wpstg-expand-dirs").removeClass("disabled");
                    $directory.find(".wpstg-subdir .wpstg-check-dir").prop("checked", true);
                }
                else
                {
                    $directory.find(".wpstg-dir .wpstg-check-dir").prop("checked", false);
                    $directory.find(".wpstg-expand-dirs, .wpstg-check-subdirs").addClass("disabled");
                    $directory.find(".wpstg-check-subdirs").data("action", "check").text("check");
                    $directory.children(".wpstg-subdir").slideUp();
                }
            })
            // Check the max length of the clone name and if the clone name already exists
            .on("keyup", "#wpstg-new-clone-id", function () {

                // This request was already sent, clear it up!
                if ("number" === typeof(timer))
                {
                    clearInterval(timer);
                }

                var cloneID = this.value;

                timer = setTimeout(
                    function() {
                        ajax(
                            {
                                action  : "wpstg_check_clone",
                                cloneID : cloneID
                            },
                            function(response)
                            {
                                if (response.status === "success")
                                {
                                    cache.get("#wpstg-new-clone-id").removeClass("wpstg-error-input");
                                    cache.get("#wpstg-start-cloning").removeAttr("disabled");
                                    cache.get("#wpstg-clone-id-error").text('');
                                }
                                else
                                {
                                    cache.get("#wpstg-new-clone-id").addClass("wpstg-error-input");
                                    cache.get("#wpstg-start-cloning").prop("disabled", true);
                                    cache.get("#wpstg-clone-id-error").text(response.message);
                                }
                            }
                        );
                    },
                    500
                );
            })
            // Display logs
            .on("click", "#wpstg-show-log-button", function (e) {
                e.preventDefault();
                var $logDetails = cache.get("#wpstg-log-details");

                $logDetails.toggle();
                cache.get("html, body").animate({
                    scrollTop: $logDetails.offset().top
                }, 400);

                that.getLogs = (false === that.getLogs);
            });

        cloneActions();
    };

    /**
     * Clone actions
     */
    var cloneActions    = function()
    {
        var $workFlow = cache.get("#wpstg-workflow");

        $workFlow
            // Cancel cloning
            .on("click", "#wpstg-cancel-cloning", function() {
                if (!confirm("Are you sure you want to cancel cloning process?"))
                {
                    return false;
                }

                var $this = $(this);

                $("#wpstg-try-again, #wpstg-home-link").hide();
                $this.prop("disabled", true);

                that.isCancelled = true;

                $("#wpstg-cloning-result").text("Please wait...this can take up to a minute");
                $("#wpstg-loader, #wpstg-show-log-button").hide();

                $this.parent().append(ajaxSpinner);

                cancelCloning();
            })
            // Delete clone - confirmation
            .on("click", ".wpstg-remove-clone[data-clone]", function(e) {
                e.preventDefault();

                var $existingClones = cache.get("#wpstg-existing-clones");

                $workFlow.removeClass('active');
                $existingClones.append(ajaxSpinner);

                ajax(
                    {
                        action  : "wpstg_confirm_delete_clone",
                        nonce   : wpstg.nonce,
                        clone   : $(this).data("clone")
                    },
                    function(response)
                    {
                        cache.get("#wpstg-removing-clone").html(response);

                        $existingClones.children("img").remove();
                    },
                    "HTML"
                );
            })
            // Delete clone - confirmed
            .on("click", "#wpstg-remove-clone", function (e) {
                e.preventDefault();

                cache.get("#wpstg-removing-clone").addClass("loading");

                deleteClone($(this).data("clone"));
            })
            // Cancel deleting clone
            .on("click", "#wpstg-cancel-removing", function (e) {
                e.preventDefault();
                $(".wpstg-clone").removeClass("active");
                cache.get("#wpstg-removing-clone").html('');
            })
            // Edit
            .on("click", ".wpstg-execute-clone", function (e) {
                e.preventDefault();

                var clone = $(this).data("clone");

                $workFlow.addClass("loading");

                ajax(
                    {
                        action  : "wpstg_scanning",
                        clone   : clone,
                        nonce   : wpstg.nonce
                    },
                    function(response)
                    {
                        if (response.length < 1)
                        {
                            showError("Something went wrong, please try again");
                        }

                        $workFlow.removeClass("loading").html(response);

                        cache.get(".wpstg-current-step")
                            .removeClass("wpstg-current-step")
                            .next("li")
                            .addClass("wpstg-current-step");
                    },
                    "HTML"
                );
            });
    };

    /**
     * Ajax Requests
     * @param {Object} data
     * @param {Function} callback
     * @param {String} dataType
     * @param {Boolean} showErrors
     */
    var ajax            = function(data, callback, dataType, showErrors)
    {
        if ("undefined" === typeof(dataType))
        {
            dataType = "json";
        }

        if (false !== showErrors)
        {
            showErrors = true;
        }

        $.ajax({
            url         : ajaxurl,
            type        : "POST",
            dataType    : dataType,
            cache       : false,
            data        : data,
            error       : function(xhr, textStatus, errorThrown) {
                console.log(xhr.status + ' ' + xhr.statusText + '---' + textStatus);
                console.log(textStatus);

                if (false === showErrors)
                {
                    return false;
                }

                showError(
                    "Fatal Error: This should not happen but is most often caused by other plugins. " +
                    "Try first the option 'Optimizer' in WP Staging->Settings and try again. " +
                    "If this does not help, enable " +
                    "<a href='https://codex.wordpress.org/Debugging_in_WordPress' target='_blank'>wordpress debug mode</a> " +
                    "to find out which plugin is causing this."
                );
            },
            success     : function(data) {
                if ("function" === typeof(callback))
                {
                    callback(data);
                }
            },
            statusCode  : {
                404: function() {
                    showError("Something went wrong; can't find ajax request URL!");
                },
                500: function() {
                    showError("Something went wrong; internal server error while processing the request!");
                }
            }
        });
    };

    /**
     * Next / Previous Step Clicks to Navigate Through Staging Job
     */
    var stepButtons     = function()
    {
        var $workFlow = cache.get("#wpstg-workflow");

        $workFlow
            // Next Button
            .on("click", ".wpstg-next-step-link", function(e) {
                e.preventDefault();

                var $this   = $(this),
                    isScan  = false;

                // Button is disabled
                if ($this.attr("disabled"))
                {
                    return false;
                }

                // Add loading overlay
                $workFlow.addClass("loading");

                // Prepare data
                that.data = {
                    action  : $this.data("action"),
                    nonce   : wpstg.nonce
                };

                // Cloning data
                getCloningData();

                console.log(that.data);

                isScan = ("wpstg_scanning" === that.action);
                console.log(isScan);

                // Send ajax request
                ajax(
                    that.data,
                    function(response) {

                        if (response.length < 1)
                        {
                            showError("Something went wrong, please try again");
                        }

                        // Styling of elements
                        $workFlow.removeClass("loading").html(response);

                        cache.get(".wpstg-current-step")
                            .removeClass("wpstg-current-step")
                            .next("li")
                            .addClass("wpstg-current-step");

                        // Start cloning
                        that.startCloning();
                    },
                    "HTML"
                );
            })
            // Previous Button
            .on("click", ".wpstg-prev-step-link", function(e) {
                e.preventDefault();
                loadOverview();
            });
    };

    /**
     * Get Excluded (Unchecked) Database Tables
     * @returns {Array}
     */
    var getExcludedTables = function()
    {
        var excludedTables = [];

        $(".wpstg-db-table input:not(:checked)").each(function () {
            excludedTables.push(this.name);
        });

        return excludedTables;
    };

    /**
     * Get Included Directories
     * @returns {Array}
     */
    var getIncludedDirectories = function()
    {
        var includedDirectories = [];

        $(".wpstg-dir input:checked").each(function () {
            var $this = $(this);
            if (!$this.parent(".wpstg-dir").parents(".wpstg-dir").children(".wpstg-expand-dirs").hasClass("disabled"))
            {
                includedDirectories.push($this.val());
            }
        });

        return includedDirectories;
    };

    /**
     * Get Excluded Directories
     * @returns {Array}
     */
    var getExcludedDirectories = function()
    {
        var excludedDirectories = [];

        $(".wpstg-dir input:not(:checked)").each(function () {
            var $this = $(this);
            if (!$this.parent(".wpstg-dir").parents(".wpstg-dir").children(".wpstg-expand-dirs").hasClass("disabled"))
            {
                excludedDirectories.push($this.val());
            }
        });

        return excludedDirectories;
    }

    /**
     * Get Cloning Step Data
     */
    var getCloningData = function()
    {
        if ("wpstg_cloning" !== that.data.action)
        {
            return;
        }

        that.data.cloneID               = $("#wpstg-new-clone-id").val() || new Date().getTime().toString();
        that.data.excludedTables        = getExcludedTables();
        that.data.includedDirectories   = getIncludedDirectories();
        that.data.excludedDirectories   = getExcludedDirectories();
        that.data.extraDirectories      = $("#wpstg_extraDirectories").val() || null;
    };

    /**
     * Loads Overview (first step) of Staging Job
     */
    var loadOverview    = function()
    {
        var $workFlow = cache.get("#wpstg-workflow");

        $workFlow.addClass("loading");

        ajax(
            {
                action  : "wpstg_overview",
                nonce   : wpstg.nonce
            },
            function(response) {

                if (response.length < 1)
                {
                    showError("Something went wrong, please try again");
                }

                var $currentStep = cache.get(".wpstg-current-step");

                // Styling of elements
                $workFlow.removeClass("loading").html(response);

                $currentStep
                    .removeClass("wpstg-current-step")
                    .next("li")
                    .addClass("wpstg-current-step");
            },
            "HTML"
        );
    };

    /**
     * Tabs
     */
    var tabs            = function()
    {
        cache.get("#wpstg-workflow").on("click", ".wpstg-tab-header", function(e) {
            e.preventDefault();

            var $this       = $(this),
                $section    = cache.get($this.data("id"));

            $this.toggleClass("expand");

            $section.slideToggle();

            if ($this.hasClass("expand"))
            {
                $this.find(".wpstg-tab-triangle").html("&#9660;");
            }
            else
            {
                $this.find(".wpstg-tab-triangle").html("&#9658;");
            }
        });
    };

    /**
     * Delete Clone
     * @param {String} clone
     */
    var deleteClone     = function(clone)
    {
        ajax(
            {
                action          : "wpstg_delete_clone",
                clone           : clone,
                nonce           : wpstg.nonce,
                excludedTables  : getExcludedTables(),
                deleteDir       : $("#deleteDirectory:checked").val()
            },
            function(response)
            {
                if (true !== response)
                {
                    deleteClone(clone);
                    return;
                }

                cache.get("#wpstg-removing-clone").removeClass("loading").html('');
                $(".wpstg-clone#" + clone).remove();

                if ($(".wpstg-clone").length < 1)
                {
                    cache.get("#wpstg-existing-clones").find("h3").text('');
                }
            }
        );
    };

    /**
     * Cancel Cloning Process
     */
    var cancelCloning   = function()
    {
        if (true === that.isFinished)
        {
            return true;
        }

        ajax(
            {
                action          : "wpstg_cancel_clone",
                clone           : that.data.cloneID,
                nonce           : wpstg.nonce
            },
            function(response)
            {
                if (true !== response)
                {
                    cancelCloning();
                    return;
                }

                // Load overview
                loadOverview();
            }
        );
    };

    var getLogs         = function()
    {
        if (true !== that.getLogs)
        {
            return;
        }

        console.log("Retrieving logs...");
        //cache.get("#wpstg-log-details").html("refreshing...");

        ajax(
            {
                action  : "wpstg_logs",
                nonce   : wpstg.nonce,
                clone   : cache.get("#wpstg-show-log-button").data("clone")
            },
            function(response)
            {
                cache.get("#wpstg-log-details").html(response);
            }
        );
    };

    /**
     * Start Cloning Process
     * @type {Function}
     */
    that.startCloning   = (function() {
        if ("wpstg_cloning" !== that.data.action)
        {
            console.log("check disk space");
            ajax(
                {
                    action: "wpstg_check_disk_space",
                    nonce: wpstg.nonce
                },
                function(response)
                {
                    if (false !==  response)
                    {
                        cache.get("#wpstg-clone-id-error").hide();
                        return;
                    }

                    // Not enough disk space
                    cache.get("#wpstg-clone-id-error").show();
                },
                "json",
                false
            );

            return;
        }

        console.log(that.data);

        // Start the process
        start();

        // Functions
        // Start
        function start()
        {
            console.log("Staring cloning process...");

            // Clone Database
            cloneDatabase();
        }

        // Step 1: Clone Database
        function cloneDatabase()
        {
            if (true === that.isCancelled)
            {
                return false;
            }

            if (true === that.getLogs)
            {
                getLogs();
            }

            setTimeout(
                function() {
                    ajax(
                        {
                            action  : "wpstg_clone_database",
                            nonce   : wpstg.nonce
                        },
                        function(response) {
                            // Add percentage
                            if ("undefined" !== typeof(response.percentage))
                            {
                                cache.get("#wpstg-db-progress").width(response.percentage + '%');
                            }

                            if (false === response.status)
                            {
                                cloneDatabase();
                            }
                            else if (true === response.status)
                            {
                                prepareDirectories();
                            }
                        }
                    );
                },
                500
            );
        }

        // Step 2: Prepare Directories
        function prepareDirectories()
        {
            if (true === that.isCancelled)
            {
                return false;
            }

            if (true === that.getLogs)
            {
                getLogs();
            }

            setTimeout(
                function() {
                    ajax(
                        {
                            action  : "wpstg_clone_prepare_directories",
                            nonce   : wpstg.nonce
                        },
                        function(response) {
                            // Add percentage
                            if ("undefined" !== typeof(response.percentage))
                            {
                                cache.get("#wpstg-directories-progress").width(response.percentage + '%');
                            }

                            if (false === response.status)
                            {
                                prepareDirectories();
                            }
                            else if (true === response.status)
                            {
                                cloneFiles();
                            }
                        }
                    );
                },
                500
            );
        }

        // Step 3: Clone Files
        function cloneFiles()
        {
            if (true === that.isCancelled)
            {
                return false;
            }

            if (true === that.getLogs)
            {
                getLogs();
            }

            ajax(
                {
                    action          : "wpstg_clone_files",
                    nonce           : wpstg.nonce
                },
                function(response) {
                    // Add percentage
                    if ("undefined" !== typeof(response.percentage))
                    {
                        cache.get("#wpstg-files-progress").width(response.percentage + '%');
                    }

                    if (false === response.status)
                    {
                        cloneFiles();
                    }
                    else if (true === response.status)
                    {
                        replaceData();
                    }
                }
            );
        }

        // Step 4: Replace Data
        function replaceData()
        {
            if (true === that.isCancelled)
            {
                return false;
            }

            if (true === that.getLogs)
            {
                getLogs();
            }

            ajax(
                {
                    action  : "wpstg_clone_replace_data",
                    nonce   : wpstg.nonce
                },
                function(response) {
                    // Add percentage
                    if ("undefined" !== typeof(response.percentage))
                    {
                        cache.get("#wpstg-links-progress").width(response.percentage + '%');
                    }

                    if (false === response.status)
                    {
                        replaceData();
                    }
                    else if (true === response.status)
                    {
                        finish();
                    }
                }
            );
        }

        // Finish
        function finish()
        {
            if (true === that.getLogs)
            {
                getLogs();
            }

            if (true === that.isCancelled || true === that.isFinished)
            {
                return false;
            }

            ajax(
                {
                    action  : "wpstg_clone_finish",
                    nonce   : wpstg.nonce
                },
                function(response)
                {
                    // Invalid response
                    if ("object" !== typeof(response))
                    {
                        showError(
                            "Couldn't finish the cloning process properly. " +
                            "Your clone has been copied but failed to do clean up and " +
                            "saving its records to the database." +
                            "Please contact support and provide your logs"
                        );

                        return;
                    }

                    console.log("Cloning process finished");

                    var $link = cache.get("#wpstg-clone-url");

                    cache.get("#wpstg_staging_name").html(that.data.cloneID);
                    cache.get("#wpstg-finished-result").show();
                    cache.get("#wpstg-cancel-cloning").prop("disabled", true);
                    $link.attr("href", $link.attr("href") + '/' + response.directoryName);
                    cache.get("#wpstg-remove-clone").data("clone", that.data.cloneID);

                    // Finished
                    that.isFinished = true;

                    finish();
                }
            );
        }
    });

    // that.deleteClone    = (function(clone) {
    //     if ("undefined" === typeof(clone))
    //     {
    //         alert("Couldn't detect clone to delete");
    //         return false;
    //     }
    //
    //     ajax(
    //         {
    //             action  : "wpstg_delete_clone",
    //             nonce   : wpstg.nonce,
    //             data    : {clone: clone}
    //         },
    //         function(response) {
    //
    //             if (response.length < 1)
    //             {
    //                 showError("Something went wrong, please try again");
    //             }
    //
    //             var $currentStep = cache.get(".wpstg-current-step");
    //
    //             // Styling of elements
    //             cache.get("#wpstg-workflow").removeClass("loading").html(response);
    //
    //             $currentStep
    //                 .removeClass("wpstg-current-step")
    //                 .next("li")
    //                 .addClass("wpstg-current-step");
    //         },
    //         "HTML"
    //     );
    // });

    /**
     * Initiation
     * @type {Function}
     */
    that.init           = (function() {
        console.log("Initiating WPStaging...");
        loadOverview();
        elements();
        stepButtons();
        tabs();
    });

    return that;
})(jQuery);

jQuery(document).ready(function() {
    WPStaging.init();
});
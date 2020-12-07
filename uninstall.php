<?php

namespace WPStaging\Backend;

use WPStaging\Backend\Optimizer\Optimizer;
use WPStaging\Framework\Staging\FirstRun;

/**
 * Uninstall WP-Staging
 *
 * @package     WPSTG
 * @subpackage  Uninstall
 * @copyright   Copyright (c) 2015, René Hermenau
 * @license     http://opensource.org/licenses/gpl-2.0.php GNU Public License
 * @since       0.9.0
 */
// No direct access
if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

// TODO; remove previous auto-loader, use composer based instead!
require_once __DIR__ . '/vendor/autoload.php';

class uninstall
{

    public function __construct()
    {

        // Plugin Folder Path
        if (!defined('WPSTG_PLUGIN_DIR')) {
            define('WPSTG_PLUGIN_DIR', plugin_dir_path(__FILE__));
        }

        // WPSTAGING expects some constants to be defined.
        if (file_exists(trailingslashit(__DIR__) . 'Pro/constants.php')) {
            include_once trailingslashit(__DIR__) . 'Pro/constants.php';
        } else {
            include_once trailingslashit(__DIR__) . 'constants.php';
        }

        /**
         * Path to main WP Staging class
         * Make sure to not redeclare class in case free version has been installed previosly
         */
        if (!class_exists('WPStaging\Core\WPStaging')) {
            require_once plugin_dir_path(__FILE__) . "Core/WPStaging.php";
        }
        $wpStaging = \WPStaging\Core\WPStaging::getInstance();

        // Delete our must use plugin
        $this->deleteMuPlugin();

        $this->init();
    }

    private function init()
    {
        $options = json_decode(json_encode(get_option("wpstg_settings", [])));

        if (isset($options->unInstallOnDelete) && $options->unInstallOnDelete === '1') {
            // Delete options
            delete_option("wpstg_version_upgraded_from");
            delete_option("wpstg_version");
            delete_option("wpstgpro_version_upgraded_from");
            delete_option("wpstgpro_version");
            delete_option("wpstg_installDate");
            delete_option("wpstg_firsttime");
            delete_option("wpstg_is_staging_site");
            delete_option("wpstg_settings");
            delete_option("wpstg_rmpermalinks_executed");
            delete_option("wpstg_activation_redirect");


            /* Do not delete these fields without actually deleting the staging site
             * @create a delete routine which deletes the staging sites first
             */
            //delete_option( "wpstg_existing_clones" );
            //delete_option( "wpstg_existing_clones_beta" );
            //delete_option( "wpstg_connection" );

            // Old wpstg 1.3 options for admin notices
            delete_option("wpstg_start_poll");
            delete_option("wpstg_hide_beta");
            delete_option("wpstg_RatingDiv");

            // New 2.x options for admin notices
            delete_option("wpstg_poll");
            delete_option("wpstg_rating");
            delete_option("wpstg_beta");

            delete_option(FirstRun::FIRST_RUN_KEY);

            // Delete events
            wp_clear_scheduled_hook('wpstg_weekly_event');

        }
    }

    /**
     * delete MuPlugin
     */
    private function deleteMuPlugin()
    {
        $optimizer = new Optimizer;
        $optimizer->uninstallOptimizer();
    }

}

new uninstall();

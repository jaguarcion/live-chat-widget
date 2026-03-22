<?php
/**
 * Plugin Name: LiveChat Widget
 * Description: Integrates the LiveChat Widget into your WordPress site.
 * Version: 1.0.0
 * Author: LiveChat
 * Text Domain: livechat-widget
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

// 1. Add Settings Menu
function livechat_widget_add_admin_menu() {
    add_options_page(
        'LiveChat Widget Options',
        'LiveChat Widget',
        'manage_options',
        'livechat-widget',
        'livechat_widget_options_page'
    );
}
add_action( 'admin_menu', 'livechat_widget_add_admin_menu' );

// 2. Register Settings
function livechat_widget_settings_init() {
    register_setting( 'livechatWidgetPlugin', 'livechat_widget_settings' );
    register_setting( 'livechatWidgetPlugin', 'livechat_widget_url', [
        'sanitize_callback' => 'esc_url_raw',
    ] );

    add_settings_section(
        'livechat_widget_plugin_page_section',
        __( 'Configure Widget', 'livechat-widget' ),
        'livechat_widget_settings_section_callback',
        'livechatWidgetPlugin'
    );

    add_settings_field(
        'livechat_widget_project_id',
        __( 'Project ID', 'livechat-widget' ),
        'livechat_widget_project_id_render',
        'livechatWidgetPlugin',
        'livechat_widget_plugin_page_section'
    );

    add_settings_field(
        'livechat_widget_url',
        __( 'Widget URL', 'livechat-widget' ),
        'livechat_widget_url_render',
        'livechatWidgetPlugin',
        'livechat_widget_plugin_page_section'
    );
}
add_action( 'admin_init', 'livechat_widget_settings_init' );

function livechat_widget_project_id_render() {
    $options = get_option( 'livechat_widget_settings' );
    $project_id = isset( $options['livechat_widget_project_id'] ) ? $options['livechat_widget_project_id'] : '';
    ?>
    <input type='text' name='livechat_widget_settings[livechat_widget_project_id]' value='<?php echo esc_attr( $project_id ); ?>' class='regular-text' placeholder='e.g. prj_123abc' />
    <p class="description"><?php _e( 'Enter your LiveChat Project ID. You can find this in your LiveChat dashboard under Installation.', 'livechat-widget' ); ?></p>
    <?php
}

function livechat_widget_url_render() {
    $url = get_option( 'livechat_widget_url', '' );
    ?>
    <input type='url' name='livechat_widget_url' value='<?php echo esc_attr( $url ); ?>' class='regular-text' placeholder='https://chat.cdk-gpt.ru/widget' />
    <p class="description"><?php _e( 'Base URL of your LiveChat widget (without trailing slash). Example: https://chat.cdk-gpt.ru/widget', 'livechat-widget' ); ?></p>
    <?php
}

function livechat_widget_settings_section_callback() {
    echo __( 'Please enter the LiveChat Project ID to enable the widget on your site.', 'livechat-widget' );
}

function livechat_widget_options_page() {
    ?>
    <div class="wrap">
        <h1>LiveChat Widget Setup</h1>
        <form action='options.php' method='post'>
            <?php
            settings_fields( 'livechatWidgetPlugin' );
            do_settings_sections( 'livechatWidgetPlugin' );
            submit_button();
            ?>
        </form>
    </div>
    <?php
}

// 3. Inject Widget Script into Footer
function livechat_widget_inject_script() {
    $options = get_option( 'livechat_widget_settings' );
    $project_id = isset( $options['livechat_widget_project_id'] ) ? $options['livechat_widget_project_id'] : '';

    if ( ! empty( $project_id ) ) {
        // In a production environment, the SRC domain should be configurable or point to the production server.
        // For this implementation, we assume the script is hosted at a domain or IP (replace YOUR_WIDGET_HOST as needed).
        // Since it's a plugin, the user usually points it to the hosted SaaS.
        $widget_url = get_option( 'livechat_widget_url', '' );
        if ( empty( $widget_url ) ) {
            return; // Widget URL not configured
        }
        $widget_js = esc_url( rtrim( $widget_url, '/' ) . '/widget.js' );
        echo "<!-- LiveChat Widget -->\n";
        echo "<script>\n";
        echo "  window.LiveChat = { projectId: '" . esc_js( $project_id ) . "' };\n";
        echo "</script>\n";
        echo "<script src='" . $widget_js . "' async crossorigin='anonymous'></script>\n";
        echo "<!-- End LiveChat Widget -->\n";
    }
}
add_action( 'wp_footer', 'livechat_widget_inject_script' );

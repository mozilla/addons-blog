<?php

declare(strict_types=1);

use PHPUnit\Framework\DOMTestCase;

final class WordPressThemeTest extends DOMTestCase
{
    private static $AMO_BASE_URL;
    private static $BUILD_DIR;

    public static function setUpBeforeClass(): void
    {
        self::$AMO_BASE_URL = $_ENV['AMO_BASE_URL']
            ? $_ENV['AMO_BASE_URL']
            : 'https://addons.mozilla.org';
        self::$BUILD_DIR = realpath(__DIR__ . '/../../build/');

        fwrite(
            STDERR,
            print_r(
                sprintf(
                    'Running with AMO_BASE_URL env variable: %s',
                    self::$AMO_BASE_URL
                ),
                true
            )
        );

        if (!is_file(self::$BUILD_DIR . '/style.css')) {
            throw new \RuntimeException(
                'You should run `yarn build:wptheme` first'
            );
        }

        require __DIR__ . '/fake-template-functions.php';
    }

    public function testSinglePage(): void
    {
        $html = $this->render('single.php', 1);
        $AMO_BASE_URL = self::$AMO_BASE_URL;

        $this->assertStringContainsString(
            "<body data-base-api-url=\"$AMO_BASE_URL\">",
            $html
        );
        $this->assertStringContainsString(
            '<title>some title - Firefox Add-ons Blog</title>',
            $html
        );
        $this->assertStringContainsString(
            "background-image: url('thumbnail.jpg');",
            $html
        );
        $this->assertSelectEquals(
            '.blogpost-content-wrapper',
            'some content',
            1,
            $html
        );
        $this->assertSelectEquals('.author', 'some author', 1, $html);
        $this->assertSelectCount('.Footer', 1, $html);
        $this->assertStringContainsString(
            'src="/path/to/template/dir/blog/assets/js/bundle.js',
            $html
        );
        $this->assertSelectCount('.Header', 0, $html);

        $this->assertStringContainsString(
            urlencode(
                implode('&', [
                    'utm_source=twitter',
                    'utm_medium=social',
                    'utm_campaign=amo_blog_share',
                ])
            ),
            $html
        );
        $this->assertSelectCount('.share-pocket-link', 1, $html);

        $this->assertSelectCount('.blogpost-breadcrumb', 1, $html);
        $this->assertStringContainsString(
            '<a href="/">Firefox Add-ons Blog</a>',
            $html
        );

        // This should not be generated when `config.is_wordpress_theme` is set
        // to `true`
        $this->assertStringNotContainsString('application/atom+xml', $html);
        $this->assertStringNotContainsString('property="og:locale"', $html);

        // This is used to detect PHP code that has been escaped. When we assign
        // PHP code to variables, we should add the `| safe` filter.
        $this->assertStringNotContainsString('&lt;?=', $html);
    }

    public function testIndexPage(): void
    {
        $html = $this->render('index.php', 2);
        $AMO_BASE_URL = self::$AMO_BASE_URL;

        $this->assertStringContainsString(
            "<body data-base-api-url=\"$AMO_BASE_URL\">",
            $html
        );
        $this->assertStringContainsString(
            '<title>Firefox Add-ons Blog</title>',
            $html
        );
        $this->assertSelectEquals('.blog-entry-title', 'some title', 2, $html);
        $this->assertSelectEquals(
            '.blog-entry-excerpt',
            'some excerpt',
            2,
            $html
        );
        $this->assertSelectCount('.Footer', 1, $html);
        $this->assertStringContainsString(
            'src="/path/to/template/dir/blog/assets/js/bundle.js',
            $html
        );
        $this->assertSelectCount('.Header', 1, $html);

        // This should not be generated when `config.is_wordpress_theme` is set
        // to `true`
        $this->assertStringNotContainsString('application/atom+xml', $html);
        $this->assertStringNotContainsString('property="og:locale"', $html);

        // This is used to detect PHP code that has been escaped. When we assign
        // PHP code to variables, we should add the `| safe` filter.
        $this->assertStringNotContainsString('&lt;?=', $html);
    }

    public function testFunctions(): void
    {
        function add_theme_support($featureName, $options)
        {
            if ($featureName !== 'post-thumbnails') {
                throw new \InvalidArgumentException('invalid feature name');
            }

            if ($options !== ['post']) {
                throw new \InvalidArgumentException(
                    'invalid options for "post-thumbnails"'
                );
            }
        }

        function add_action($hookName, $funcName)
        {
            $funcName();
        }

        require __DIR__ . '/../../build/functions.php';

        $this->expectNotToPerformAssertions();
    }

    public function testNoRobotsTxt(): void
    {
        $this->assertNotTrue(is_file(self::$BUILD_DIR . '/robots.txt'));
    }

    private function render($template, $posts = 0): string
    {
        global $nb_posts;
        $nb_posts = $posts;

        ob_start();
        @include self::$BUILD_DIR . '/' . $template;

        return ob_get_clean();
    }
}

<?php

declare(strict_types=1);

use PHPUnit\Framework\DOMTestCase;

final class WordPressThemeTest extends DOMTestCase
{
    private static $BUILD_DIR;

    public static function setUpBeforeClass(): void
    {
        self::$BUILD_DIR = realpath(__DIR__ . '/../../build/');

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

        $this->assertStringContainsString(
            '<title>some title - Mozilla Add-ons Blog</title>',
            $html
        );
        $this->assertStringContainsString(
            "background-image: url('thumbnail.jpg');",
            $html
        );
        $this->assertSelectEquals('.Content-wrapper', 'some content', 1, $html);
        $this->assertSelectEquals('.Author', 'some author', 1, $html);
        $this->assertSelectCount('.Footer', 1, $html);
        $this->assertStringContainsString(
            'src="/path/to/template/dir/assets/js/bundle.js',
            $html
        );
        $this->assertStringNotContainsString('application/atom+xml', $html);
    }

    public function testIndexPage(): void
    {
        $html = $this->render('index.php', 2);

        $this->assertStringContainsString(
            '<title>Mozilla Add-ons Blog</title>',
            $html
        );
        $this->assertSelectEquals('.post-title', 'some title', 2, $html);
        $this->assertSelectEquals('.excerpt', 'some content', 2, $html);
        $this->assertSelectCount('.Footer', 1, $html);
        $this->assertStringContainsString(
            'src="/path/to/template/dir/assets/js/bundle.js',
            $html
        );
        $this->assertStringNotContainsString('application/atom+xml', $html);
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

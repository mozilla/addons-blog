<?php

declare(strict_types=1);

use PHPUnit\Framework\DOMTestCase;

final class WordPressThemeTest extends DOMTestCase
{
    public static function setUpBeforeClass(): void
    {
        if (!is_file(__DIR__ . '/../../build/style.css')) {
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
            "url('thumbnail.jpg') no-repeat",
            $html
        );
        $this->assertSelectEquals('.Content-wrapper', 'some content', 1, $html);
        $this->assertSelectEquals('.Author', 'some author', 1, $html);
        $this->assertSelectCount('.Footer', 1, $html);
        $this->assertStringContainsString(
            'src="/path/to/template/dir/assets/js/bundle.js',
            $html
        );
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

    private function render($template, $posts = 0): string
    {
        global $nb_posts;
        $nb_posts = $posts;

        ob_start();
        @include __DIR__ . '/../../build/' . $template;

        return ob_get_clean();
    }
}

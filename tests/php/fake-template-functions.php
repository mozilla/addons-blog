<?php

global $nb_posts;
$nb_posts = 0;

function get_template_directory_uri(): string
{
    return '/path/to/template/dir';
}

function have_posts(): bool
{
    global $nb_posts;

    return $nb_posts > 0;
}

function the_post(): void
{
    global $nb_posts;

    $nb_posts--;
}

function get_the_title(): string
{
    return 'some title';
}

function get_the_content(): string
{
    return 'some content';
}

function get_the_time($format): string
{
    return (new \DateTime())->format($format);
}

function get_the_author(): string
{
    return 'some author';
}

function get_permalink(): string
{
    return '/blog/some-post';
}

function get_the_post_thumbnail_url(): string
{
    return 'thumbnail.jpg';
}

function get_the_id(): string
{
    return 'post-id';
}

function get_the_excerpt(): string
{
    return 'some excerpt';
}

function get_the_modified_date($format): string
{
    return (new \DateTime())->format($format);
}

function get_avatar_url($id, $args = []): string
{
    if ($id !== get_the_author_meta('ID')) {
        throw new \RuntimeException('invalid ID');
    }

    if (!isset($args['size'])) {
        throw new \RuntimeException('missing "size" option');
    }

    return 'some avatar url';
}

function get_previous_post()
{
    return null;
}

function get_next_post()
{
    return null;
}

function get_the_author_meta($field): int
{
    switch ($field) {
        case 'ID':
            return 123;
        default:
            throw new \RuntimeException('unexpected field');
    }
}

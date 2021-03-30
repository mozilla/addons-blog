<?php

declare(strict_types=1);

if (!($loader = @include __DIR__ . '/../../vendor/autoload.php')) {
    die(
        <<<EOT
You need to install the project dependencies using Composer, see: https://getcomposer.org/
EOT
    );
}

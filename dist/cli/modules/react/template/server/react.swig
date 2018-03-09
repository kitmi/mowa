<!doctype html>
<html lang="en_AU">

<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="keywords" content="{{ pageKeywords }}" />
    <meta name="description" content="{{ pageDescription }}" />
    <title>{{ pageTitle }}</title>
    <style>
        body {
            margin: 0
        }
    </style>
</head>

<body>
    <div id="app"></div>
    <script>
        window.__basePath = "{{ _module.route }}";
        window.__appState = {{ appState|json|safe }};
    </script>
    <script src="{{ _util.makePath(pageName + '.bundle.js') }}"></script>
</body>

</html>
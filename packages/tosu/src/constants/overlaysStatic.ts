export const OVERLAYS_STATIC = `<html>
<head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@100&display=swap" rel="stylesheet">
    <title>ts osu overlays list</title>
    <style>
    * {
        font-family: 'Roboto', sans-serif;
    }

    body {
        color: white;
        background: rgb(60, 60, 60);
    }

    a {
        color: white;
    }
    </style>
</head>
<body>
    <ul id="overlays-list">

    </ul>
</body>
<script lang="text/javascript" defer>
    (async () => {
        const overlaysList = document.getElementById("overlays-list")

        try {
            const res = await fetch("/api/getOverlays")
            const overlayList = await res.json()
            overlayList.innerHTML = ''
            for (const overlay of overlayList) {
                const newLi = document.createElement("li")
                newLi.innerHTML = \`<a href="/\${overlay}/index.html">\${overlay}</a>\`

                overlaysList.appendChild(newLi)
            }
            console.log(overlayList);
        } catch (e) {
            console.error(e)
            overlaysList.innerHTML = \`
                <li>failed to get overlays</li>
            \`
        }
    })();
</script>
</html>`;

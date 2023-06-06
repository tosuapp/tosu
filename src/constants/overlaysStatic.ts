export const OVERLAYS_STATIC = `<html>
<head>
    <title>ts osu overlays list</title>
    <style>
    body {
        color: white;
        background: black;
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

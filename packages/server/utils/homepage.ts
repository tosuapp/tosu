export const OVERLAYS_STATIC = `<html>
<head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@100&display=swap" rel="stylesheet">
    <title>{PAGE_URL}</title>
    <style>
    * {
        // padding: 0;
        margin: 0;
        box-sizing: border-box;
        // min-width: 0;
    }
    
    body {
        font-size: 2.5em;
        font-family: 'Roboto', sans-serif;
        font-weight: 600;
        color: #c9abae;
        background: #110d0d;
    }

    ul {
        margin: 30px;
        list-style: decimal-leading-zero;
        display: grid;
        grid-template-columns: 25% 25% 25% 25%;
        padding: 0;
    }

    li {
        margin-left: 2em;
    }

    a {
        color: #b5616b;
        text-decoration: underline;
        text-underline-offset: 6px;
        transition: 0.2s ease;
        transition-property: text-underline-offset, color;
        overflow-wrap: break-word;
    }

    a:hover {
        color: #c9abae;
        text-underline-offset: 4px;
    }
    </style>
</head>
<body>
    <ul id="overlays-list">{OVERLAYS_LIST}</ul>
</body>
<script lang="text/javascript" defer>
    // (async () => {
    //     const overlaysList = document.getElementById("overlays-list")

    //     try {
    //         const res = await fetch("/api/getOverlays")
    //         const overlayList = await res.json()
    //         overlayList.innerHTML = ''
    //         for (const overlay of overlayList) {
    //             const newLi = document.createElement("li")
    //             newLi.innerHTML = \`<a href="/\${overlay}/index.html">\${overlay}</a>\`

    //             overlaysList.appendChild(newLi)
    //         }
    //         console.log(overlayList);
    //     } catch (e) {
    //         console.error(e)
    //         overlaysList.innerHTML = \`
    //             <li>failed to get overlays</li>
    //         \`
    //     }
    // })();
</script>
</html>`;

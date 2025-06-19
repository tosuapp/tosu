export const iconsImages = {
    'github.com': '/assets/images/github-000000.svg',
    'twitter.com': '/assets/images/twitter-1DA1F2.svg',
    'discord.gg': '/assets/images/discord-5865f2.svg',
    'discord.com': '/assets/images/discord-5865f2.svg'
};

export const emptyNotice =
    '<div class="no-results">No counters<br /><a href="/available">Go here to get one 👉</a></div>';
export const emptyCounters =
    '<div class="no-results">No counters<br />Change your search phrase</div>';
export const noMoreCounters =
    '<div class="no-results">Nice job!<br />You downloaded all available pp counters</div>';

export const iframeHTML =
    '<iframe src="{URL}" width="{WIDTH}" height="{HEIGHT}" n="{NAME}" scrolling="no" frameborder="0"></iframe>';

export const metadataHTML = `
<div>URL: <span nf nft="url" nfv="{COPY_URL}" class="copyable">{TEXT_URL}</span></div>
<div>Resolution: <span nf nft="width" nfv="{COPY_X}" class="copyable">{X}</span> x <span nf nft="height" nfv="{COPY_Y}" class="copyable">{Y}</span></div>
`;

export const nameHTML = '<h4 class="{CLASS}">{NAME}</h4>';
export const authorHTML = '<span>by {AUTHOR}</span>';
export const authorLinksHTML =
    '<a href="{LINK}" target="_blank"><img loading="lazy" src="{ICON_URL}" /></a>';

export const galleryImageHTML = '<img loading="lazy" src="{LINK}" />';

export const resultItemHTML = `
<div class="result-item{CLASS}">
  <div class="ri-head flexer">
    <div>
      {NAME}
      <div class="ri-links flexer">{AUTHOR}{AUTHOR_LINKS}</div>
    </div>
    {BUTTONS}
  </div>
  <hr>
  <div class="ri-gallery flexer">{GALLERY}</div>
  {FOOTER}
</div>`;

export const settingsItemHTML = `
<div class="si flexer {CLASSES}">
  <div>
    <h4>{NAME}</h4>
    <p>{DESCRIPTION}</p>
  </div>
  {INPUT}
</div>`;

export const checkboxHTML = `
<label class="si-checkbox">
  <input type="checkbox" name="{NAME}" id="{ID}" {ADDON} value="{VALUE}" />
  <span class="checkmark"></span>
  <span class="status"></span>
</label>`;

export const inputHTML =
    '<input type="{TYPE}" id="{ID}" {ADDON} value="{VALUE}">';

export const textareaHTML = '<textarea id="{ID}" {ADDON}>{VALUE}</textarea>';

export const settingsGroupHTML = `
<div class="settings-item-group">
  <p>{header}</p>
    <div>
      {items}
    </div>
</div>
`;

export const settingsItemHTMLv2 = `
<div class="settings-item-v2">
  <div>
    {input-1}
    <p>{name}</p>
    {input-2}
  </div>
  {input-3}
  <p>{description}</p>
</div>
`;

export const settingsSwitchHTML = `
<label class="switch" data-id="{id}">
  <input type="checkbox" class="switch-thumb" {checked}>
  <span class="switch-track"></span>
</label>
`;
export const settingsNumberInputHTML = `
<div class="number-input" data-id="{id}">
  <button title="[Click] decrements by 1\n[Shift + Click] by 10" class="decr">-</button>
  <input type="number" value="{value}" min="{min}" max="{max}">
  <button title="[Click] increments by 1\n[Shift + Click] by 10" class="incr">+</button>
</div>
`;

export const settingsTextInputHTML = `
<div class="text-input" data-id="{id}">
  <input type="text" value="{value}">
</div>
`;

export const settingsTextareaInputHTML = `
<div class="textarea-input" data-id="{id}">
  <textarea>{value}</textarea>
</div>
`;

export const settingsSaveButtonHTMLv2 = `
<div class="settings-save-button">
    <button class="button" disabled>Save Settings</button>
</div>
`;

export const saveSettingsButtonHTML =
    '<div class="flexer si-btn ssb"><button class="button save-button flexer"><span>Save settings</span></button></div>';

export const searchBar = `<input class="search-bar" type="text" placeholder="Type counter name to search..." />`;

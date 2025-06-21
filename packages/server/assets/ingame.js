class WebSocketManager {
  constructor(host) {
    if (host) {
      this.host = host;
    }

    this.createConnection = this.createConnection.bind(this);

    /**
     * @type {{ [key: string]: WebSocket }} - asd;
     */
    this.sockets = {};
  }

  createConnection(url, callback, filters) {
    let INTERVAL = '';

    const that = this;
    const parse_url = new URL(window.location.href);
    let socket_url = `ws://${this.host}${url}?l=__ingame__`;
    if (parse_url.searchParams.get('edit')) socket_url += `&iframe=true`;

    this.sockets[url] = new WebSocket(socket_url);

    this.sockets[url].onopen = () => {
      console.log(`[OPEN] ${url}: Connected`);

      if (INTERVAL) clearInterval(INTERVAL);
      if (Array.isArray(filters)) {
        this.sockets[url].send(`applyFilters:${JSON.stringify(filters)}`);
      }
    };

    this.sockets[url].onclose = (event) => {
      console.log(`[CLOSED] ${url}: ${event.reason}`);

      delete this.sockets[url];
      INTERVAL = setTimeout(() => {
        that.createConnection(url, callback, filters);
      }, 1000);
    };

    this.sockets[url].onerror = (event) => {
      console.log(`[ERROR] ${url}: ${event.reason}`);
    };


    this.sockets[url].onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error != null) {
          console.error(`[MESSAGE_ERROR] ${url}:`, data.error);
          return;
        };

        if (data.message != null) {
          if (data.message.error != null) {
            console.error(`[MESSAGE_ERROR] ${url}:`, data.message.error);
            return;
          }
        };

        callback(data);
      } catch (error) {
        console.log(`[MESSAGE_ERROR] ${url}: Couldn't parse incomming message`, error);
      };
    };
  };
  /**
   * Connects to tosu advanced socket api.
   * @param {(data: WEBSOCKET_V2) => void} callback - The function to handle received messages.
   * @param {Filters[]} filters
   */
  api_v2(callback, filters) {
    this.createConnection(`/websocket/v2`, callback, filters);
  };


  /**
   * Connects to message
   * @param {(data: { command: string, message: any }) => void} callback - The function to handle received messages.
   */
  commands(callback) {
    this.createConnection(`/websocket/commands`, callback);
  };

  /**
   *
   * @param {string} name
   * @param {string|Object} payload
   */
  sendCommand(name, command, amountOfRetries = 1) {
    const that = this;


    if (!this.sockets['/websocket/commands']) {
      setTimeout(() => {
        that.sendCommand(name, command, amountOfRetries + 1);
      }, 100);

      return;
    };


    try {
      const payload = typeof command == 'object' ? JSON.stringify(command) : command;
      this.sockets['/websocket/commands'].send(`${name}:${payload}`);
    } catch (error) {
      if (amountOfRetries <= 3) {
        console.log(`[COMMAND_ERROR] Attempt ${amountOfRetries}`, error);
        setTimeout(() => {
          that.sendCommand(name, command, amountOfRetries + 1);
        }, 1000);
        return;
      };


      console.error(`[COMMAND_ERROR]`, error);
    };
  };


  close(url) {
    this.host = url;

    const array = Object.keys(this.sockets);
    for (let i = 0; i < array.length; i++) {
      const key = array[i];
      const value = this.sockets[key];

      if (!value) continue;
      value.close();
    };
  };
};

const { createApp, ref, computed, watch, watchEffect } = Vue;
const socket = new WebSocketManager(window.location.host);


const app = createApp({
  setup() {
    const settings_debounce = debounce((v, old) => {
      save_settings();
    }, 400);

    const is_edit_available_by_default = new URL(location.href).searchParams.get('edit') === 'true';
    const is_edit = ref(is_edit_available_by_default);

    const max_width = ref(window.innerWidth);
    const max_height = ref(window.innerHeight);
    const cursor = ref({
      type: 'default'
    });

    const empty_ctx = ref(null);
    const overlay_ctx = ref(null);



    /** @type { { value: ICounter[] } } */
    const available_overlays = ref(window.COUNTERS || []);
    /** @type { { value: Overlay[] } } */
    const overlays = ref([]);



    const context_empty = ref({
      _: false,
      showed: false,
      x: 0,
      x1: 0,
      y: 0,
      y1: 0,
    });

    const context_overlay = ref({
      _: false,
      showed: false,
      selected: -1,
      x: 0,
      x1: 0,
      y: 0,
      y1: 0,
    });


    const settings = computed(() => {
      const array = JSON.stringify(overlays.value);
      return { overlays: array };
    });


    watch(settings, settings_debounce);
    watchEffect(() => {
      document.body.style.cursor = cursor.value.type;
    });
    watchEffect(() => {
      document.body.style.setProperty('--w', `${max_width.value}px`);
      document.body.style.setProperty('--h', `${max_height.value}px`);
    });

    watchEffect(() => {
      if (is_edit.value == true) document.body.classList.add('-editing');
      else document.body.classList.remove('-editing');
    });


    let _id = 0;

    let hovered_index = -1;
    let copy_index = -1;

    let is_dragging = false;
    let is_resizing = false;

    let initial_left = 0;
    let initial_top = 0;

    let initial_width = 0;
    let initial_height = 0;

    let initial_scale = 0;

    let start_x = 0;
    let start_y = 0;

    let resize_elm = null;
    let drag_elm = null;

    const resize_direction = {
      top: false,
      left: false,
      right: false,
      bottom: false,
    };


    function round_up(value) {
      if (value == null || value == '') return 0;

      const num = parseFloat(value);
      return Number.isFinite(num) ? +num.toFixed(4) : 0;
    };

    function side_decide(event, is_resize) {
      if (is_dragging && is_resize != true) return;


      const element = event.target;

      const client_rect = element.getBoundingClientRect();
      const offset = 15;

      const is_top = event.clientY - client_rect.top < offset;
      const is_left = event.clientX - client_rect.left < offset;
      const is_right = client_rect.right - event.clientX < offset;
      const is_bottom = client_rect.bottom - event.clientY < offset;

      if (is_resize) return (is_top || is_left || is_right || is_bottom) && !event.shiftKey;


      if (event.shiftKey) cursor.value.type = 'move';
      else if (is_left && is_top) cursor.value.type = 'nw-resize';
      else if (is_right && is_top) cursor.value.type = 'ne-resize';
      else if (is_left && is_bottom) cursor.value.type = 'ne-resize';
      else if (is_right && is_bottom) cursor.value.type = 'nw-resize';
      else if (is_left || is_right) cursor.value.type = 'ew-resize';
      else if (is_top || is_bottom) cursor.value.type = 'ns-resize';
      else cursor.value.type = 'move';

      if (is_resizing) return;

      resize_direction.top = is_top;
      resize_direction.left = is_left;
      resize_direction.right = is_right;
      resize_direction.bottom = is_bottom;


      const index = element.attributes.getNamedItem('data-ind').value;
      if (!index) {
        // console.log('[side_decide]', `cant find index`, event);

        return;
      };


      hovered_index = index;
    };


    function resizing(event) {
      if (!is_resizing) return;

      const element = resize_elm;
      if (!element) return;

      const index = element.attributes.getNamedItem('data-ind').value;
      if (!index) {
        // console.log(`[resizing-${event.ctrlKey ? 'scale' : ''}]`, `cant find index`, event);

        return;
      };

      const find = overlays.value[index];
      if (!find) {
        // console.log(`[resizing-${event.ctrlKey ? 'scale' : ''}]`, `cant find overlay`, event);

        return;
      };


      if (event.ctrlKey) {
        const client_rect = element.getBoundingClientRect();
        const offset_x = (event.clientX - start_x) * element.style.scale;

        const scale = initial_scale + offset_x / client_rect.width;
        if (scale < 0.1) return;

        find.scale = round_up(scale);
        return;
      };


      const offset_x = event.clientX - start_x;
      const offset_y = event.clientY - start_y;

      if (resize_direction.left) {
        const width = initial_width - offset_x;
        const left = initial_left + offset_x


        if (width >= 10 && left + width <= max_width.value) {
          find.left = round_up(Math.max(0, left));
          find.width = round_up(Math.max(10, width / initial_scale));

          // element.style.left = `${Math.max(0, left)}px`;
          // element.style.width = `${Math.max(10, width / initial_scale)}px`;

          // console.log('left', initial_scale, element.style.left, element.style.width);
        };
      }
      else if (resize_direction.right) {
        const width = initial_width + offset_x;
        if (initial_left + width <= max_width.value) {
          find.width = round_up(Math.max(10, width / initial_scale));
          // element.style.width = `${Math.max(10, width / initial_scale)}px`;

          // console.log('right', initial_scale, element.style.width);
        };
      };


      if (resize_direction.top) {
        const height = initial_height - offset_y;
        const top = initial_top + offset_y;

        if (height >= 10 && top + height <= max_height.value) {
          find.height = round_up(Math.max(10, height / initial_scale));
          find.top = round_up(Math.max(0, top));
          // element.style.height = `${Math.max(10, height / initial_scale)}px`;
          // element.style.top = `${Math.max(0, top)}px`;

          // console.log('top', initial_scale, element.style.height, element.style.top);
        };
      }
      else if (resize_direction.bottom) {
        const height = initial_height + offset_y;
        if (initial_top + height <= max_height.value) {
          find.height = round_up(Math.max(10, height / initial_scale));
          // element.style.height = `${Math.max(10, height / initial_scale)}px`;

          // console.log('bottom', initial_scale, element.style.height);
        }
      };

    };


    function enable_drag(event) {
      const type = side_decide(event, true);
      if (type) {
        is_resizing = true;
        resize_elm = event.target;
      }
      else {
        is_dragging = true;
        drag_elm = event.target;
      }


      const client_rect = event.target.getBoundingClientRect();

      initial_top = +event.target.style.top.replace('px', '');
      initial_left = +event.target.style.left.replace('px', '');

      initial_width = client_rect.width;
      initial_height = client_rect.height;

      initial_scale = +event.target.style.scale;

      start_x = event.clientX;
      start_y = event.clientY;
    };


    function stop_drag() {
      is_dragging = false;
      is_resizing = false;
    };



    window.addEventListener('mousemove', (event) => {
      if (is_resizing) return resizing(event);
      if (!is_dragging) return;

      const element = drag_elm;
      if (!element) return;


      const client_rect = element.getBoundingClientRect();

      const offset_x = event.clientX - start_x;
      const offset_y = event.clientY - start_y;

      const element_width = client_rect.width;
      const element_height = client_rect.height;


      const index = element.attributes.getNamedItem('data-ind').value;
      if (!index) {
        // console.log('[mousemove]', `cant find url`, event);

        return;
      };

      const find = overlays.value[index];
      if (!find) {
        // console.log('[mousemove]', `cant find overlay`, event);

        return;
      };

      find.top = round_up(Math.max(0, Math.min(max_height.value - element_height, initial_top + offset_y)));
      find.left = round_up(Math.max(0, Math.min(max_width.value - element_width, initial_left + offset_x)));

      // console.log('move', { offset_x, offset_y, element_width, element_height });
    });

    window.addEventListener('mouseup', stop_drag);


    window.addEventListener('contextmenu', (event) => {
      if (event.target.classList.contains('overlay')) {
        // if (overlay_ctx.value?.contains(event.target)) return;
        const index = event.target.attributes.getNamedItem('data-ind').value;
        if (!index) return;


        event.preventDefault();

        context_overlay.value._ = true;

        context_overlay.value.index = index;

        context_overlay.value.y1 = event.clientY;
        context_overlay.value.x1 = event.clientX;


        setTimeout(() => {
          const size = overlay_ctx.value.getBoundingClientRect();

          const toRight = event.clientY + size.height > max_height.value;
          const toTop = event.clientX + size.width > max_width.value;


          context_overlay.value.y = toRight ? event.clientY - size.height : event.clientY;
          context_overlay.value.x = toTop ? event.clientX - size.width : event.clientX;


          setTimeout(() => {
            context_overlay.value.showed = true;
          }, 1);
        }, 1);
        return;
      };


      const modal = document.querySelector('.modal');
      if (modal && modal.contains(event.target)) return;

      if (empty_ctx.value?.contains(event.target)) return;
      if (overlay_ctx.value?.contains(event.target)) return;
      event.preventDefault();

      context_empty.value._ = true;
      context_overlay.value._ = false;

      context_overlay.value.index = -1;

      context_empty.value.y1 = event.clientY;
      context_empty.value.x1 = event.clientX;


      setTimeout(() => {
        const size = empty_ctx.value.getBoundingClientRect();

        const toRight = event.clientY + size.height > max_height.value;
        const toTop = event.clientX + size.width > max_width.value;


        context_empty.value.y = toRight ? event.clientY - size.height : event.clientY;
        context_empty.value.x = toTop ? event.clientX - size.width : event.clientX;


        setTimeout(() => {
          context_empty.value.showed = true;
        }, 1);
      }, 1);
    });


    window.addEventListener('mousedown', (event) => {
      if (empty_ctx.value) {
        if (empty_ctx.value.contains(event.target)) return;

        context_empty.value._ = false;
      };

      if (overlay_ctx.value) {
        if (overlay_ctx.value.contains(event.target)) return;

        context_overlay.value._ = false;
        context_overlay.value.index = -1;
      };

      // console.log('lost', event);
    });


    window.addEventListener('resize', (event) => {
      max_width.value = window.innerWidth;
      max_height.value = window.innerHeight;
    });


    window.addEventListener('keydown', (event) => {
      const key = (event.code || event.key).toLowerCase();
      if (key == 'delete' && hovered_index > -1) {
        remove_overlay(hovered_index);

        hovered_index = -1;
      };


      if ((key == 'keyc' || key == 'c') && event.ctrlKey) {
        let element;
        if (context_overlay.value.index > -1 && overlay_ctx.value) {
          element = overlay_ctx.value;

          copy_index = context_overlay.value.index;
        }
        else if (hovered_index > -1) {
          element = document.querySelector(`[data-ind="${hovered_index}"]`);

          copy_index = hovered_index;
        };



        element.classList.add('hlh-copy');
        setTimeout(() => {
          element.classList.remove('hlh-copy');
        }, 200);
      };

      if ((key == 'keyv' || key == 'v') && event.ctrlKey) {
        let element;
        if (context_overlay.value.index > -1 && overlay_ctx.value) {
          element = overlay_ctx.value;
        }
        else if (copy_index > -1) {
          element = document.querySelector(`[data-ind="${copy_index}"]`);
        };

        overlays.value[copy_index].width = overlays.value[hovered_index].width;
        overlays.value[copy_index].height = overlays.value[hovered_index].height;
        overlays.value[copy_index].top = overlays.value[hovered_index].top;
        overlays.value[copy_index].left = overlays.value[hovered_index].left;
        overlays.value[copy_index].scale = overlays.value[hovered_index].scale;
        overlays.value[copy_index].z_index = overlays.value[hovered_index].z_index + 1;


        copy_index = -1;
        hovered_index = -1;

        element.classList.add('hlh-paste');
        setTimeout(() => {
          element.classList.remove('hlh-paste');
        }, 200);
      };
    });


    window.addEventListener('wheel', (event) => {
      const index = event.target.attributes.getNamedItem('data-ind')?.value;
      if (!index) return;

      const overlay = overlays.value[index];
      let class_name = '';


      if (event.deltaY < 0) {
        if (overlay.z_index >= 999) return;
        class_name = 'up';

        overlay.z_index++;
      }
      else {
        if (overlay.z_index <= 0) return;
        class_name = 'down';

        overlay.z_index--;
      };


      event.target.classList.add(`hlh-index-${class_name}`);
      setTimeout(() => {
        event.target.classList.remove(`hlh-index-${class_name}`);
      }, 100);
    });

    window.addEventListener('message', data => {
      if (data.data == 'editingStarted') {
        is_edit.value = true;
      }
      else if (data.data == 'editingEnded') {
        is_edit.value = false;

        context_empty.value._ = false;
        context_overlay.value._ = false;
        closeModal_func(null);
      };
    });



    /**
     *
     * @param {ICounter} overlay
     */
    function add_overlay(overlay) {
      _id++;
      overlays.value.push({
        _settings: Array.isArray(overlay.settings) ? overlay.settings.length > 0 : false,
        id: _id,
        folderName: overlay.folderName,

        url: `${window.location.origin}/${overlay.folderName}`,
        width: Math.min(max_width.value - context_empty.value.x1, overlay.resolution[0]),
        height: Math.min(max_height.value - context_empty.value.y1, overlay.resolution[1]),

        top: context_empty.value.y1,
        left: context_empty.value.x1,
        scale: 1,
        z_index: 1,
      });


      context_empty.value._ = false;
    };


    function reset_overlay(index) {
      const item = overlays.value[index];
      if (!item) return;


      const find = available_overlays.value.find(r => item.url.endsWith(r.folderName));
      if (!find) return;


      item.width = Math.min(max_width.value - item.left, find.resolution[0]);
      item.height = Math.min(max_height.value - item.top, find.resolution[1]);

      item.scale = 1;
      item.z_index = 1;
      // context_overlay.value._ = false;
    };


    function remove_overlay(index) {
      overlays.value.splice(index, 1);
      context_overlay.value._ = false;
    };


    function reset_hover() {
      hovered_index = -1;
      cursor.value.type = 'default';
    };



    async function save_settings() {
      try {
        await fetch('/api/counters/settings/__ingame__', {
          method: 'POST',
          body: JSON.stringify({ overlays: overlays.value })
        });
      } catch (error) {
        console.log(error);
      };
    };

    function notification({ text, classes, delay }) {
      const div = document.createElement('div');
      div.classList.add('notification');
      div.classList.add('hidden');
      if (Array.isArray(classes)) div.classList.add(...classes);

      div.style.top = `2em`;
      div.style.right = `2em`;

      div.style.left = `unset`;
      div.style.bottom = `unset`;

      div.innerHTML = text;


      document.querySelector('main').appendChild(div);
      setTimeout(() => {
        div.classList.remove('hidden');
      }, 10);

      setTimeout(() => {
        div.classList.add('hidden');

        setTimeout(() => {
          document.querySelector('main').removeChild(div);
        }, 310);
      }, delay);
    };


    socket.sendCommand('getSettings', encodeURI('__ingame__'));
    socket.sendCommand('getCounters', encodeURI('__ingame__'));
    socket.commands((data) => {
      try {

        const { command, message } = data;
        if (command == 'getSettings') {
          if (JSON.stringify(message.overlays || []) != JSON.stringify(overlays.value)) {
            overlays.value = message.overlays;
          };
        };


        if (command == 'getCounters' && Array.isArray(message)) {
          available_overlays.value = message;
        }
      } catch (error) {
        console.log(error);
      };
    });


    return {
      max_width, max_height, cursor,
      empty_ctx, overlay_ctx,
      available_overlays, overlays,
      context_empty, context_overlay,
      side_decide, enable_drag, stop_drag,
      add_overlay, reset_overlay, remove_overlay,
      reset_hover,
      round_up,
      notification,
    };
  },
});

app.mount('.main');


/**
 * @typedef {Object} Overlay
 * @property {boolean | undefined} _settings
 * @property {string} id
 * @property {string} folderName
 * @property {string} url
 * @property {number} top
 * @property {number} left
 * @property {number} width
 * @property {number} height
 * @property {number} scale
 * @property {number} z_index
 */

/**
 * @typedef {Object} ISettings
 * @property {string} uniqueID - The unique identifier for the setting.
 * @property {string} [uniqueCheck] - Optional unique check identifier.
 * @property {ISettingsType} type - The type of the setting.
 * @property {string} title - The title of the setting.
 * @property {(string[] | Array<{required: boolean, type: 'text' | 'number' | 'checkbox' | 'options', name: string, title: string, description: string, values: string[], value: any}>)} [options] - Optional options for the setting.
 * @property {string} description - The description of the setting.
 * @property {any} value - The value of the setting.
 */

/**
 * @typedef {'text' | 'color' | 'number' | 'checkbox' | 'button' | 'options' | 'commands' | 'textarea' | 'password' | 'header'} ISettingsType - The type of a setting.
 */

/**
 * @typedef {Object} ICounter
 * @property {boolean} [_downloaded] - Optional flag indicating if it has been downloaded.
 * @property {boolean} [_updatable] - Optional flag indicating if it is updatable.
 * @property {boolean} [_settings] - Optional flag indicating if settings are available.
 * @property {string} folderName - The folder name.
 * @property {string} name - The name of the counter.
 * @property {string} author - The author of the counter.
 * @property {string} version - The version of the counter.
 * @property {number[]} resolution - The resolution of the counter.
 * @property {string[]} authorlinks - Links related to the author.
 * @property {ISettings[]} settings - Array of settings.
 * @property {string} [usecase] - Optional use case description.
 * @property {string} [compatiblewith] - Optional information about compatibility.
 * @property {Array<{type: string, url: string}>} [assets] - Optional array of assets with type and URL.
 * @property {string} [downloadLink] - Optional download link.
 */


/**
 * @typedef {string | { field: string; keys: Filters[] }} Filters
 */


function debounce(callback, wait) {
  let timeoutId = null;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, wait);
  };
};
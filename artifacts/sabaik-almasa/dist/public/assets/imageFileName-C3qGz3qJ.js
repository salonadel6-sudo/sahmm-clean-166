function o(n){const e=n?.trim()??"";if(!e)return"";const t=e.split(/[?#]/,1)[0].replace(/\/+$/,"").split("/").pop()||e;try{return decodeURIComponent(t)}catch{return t}}export{o as g};

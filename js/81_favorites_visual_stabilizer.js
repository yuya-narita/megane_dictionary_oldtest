(() => {
  const st=document.createElement("style");
  st.textContent=`
    #favoriteList.favorite-list{min-height:120px;contain:layout paint;}
    #favoriteList .favorite-item{opacity:1!important;text-align:left!important;justify-content:flex-start!important;align-items:flex-start!important;}
    #favoriteList .favorite-item *{text-align:left!important;}
    #favoriteDialog .favorite-tabs-v27{display:none!important;}
  
    #favoriteList .fav-singleton-row{background:rgba(255,255,255,.06)!important;}
    #favoriteList .fav-singleton-row.delete-armed{background:rgba(128,38,54,.68)!important;}

    #favoriteList .favorite-item:focus,
    #favoriteList .favorite-item:focus-visible{outline:none!important;box-shadow:none!important;}
`;
  document.head.appendChild(st);
})();
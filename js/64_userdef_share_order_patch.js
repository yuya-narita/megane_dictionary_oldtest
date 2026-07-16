(()=> {
  const st=document.createElement("style");
  st.textContent=`
    #userDefinitionShare:disabled,
    #userDefinitionShare.disabled{
      opacity:.45;
      filter:saturate(.7);
    }
    #userDefinitionText{
      white-space:pre-wrap;
    }
  `;
  document.head.appendChild(st);
})();
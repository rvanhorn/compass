// Match the hue of the other appearance, adapting lightness rather than inverting color.
export function pairedAccent(hex,theme){
 const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255),max=Math.max(...rgb),min=Math.min(...rgb),delta=max-min;
 let hue=0,saturation=0;const lightness=(max+min)/2;
 if(delta){saturation=delta/(1-Math.abs(2*lightness-1));hue=max===rgb[0]?((rgb[1]-rgb[2])/delta)%6:max===rgb[1]?(rgb[2]-rgb[0])/delta+2:(rgb[0]-rgb[1])/delta+4;hue=(hue*60+360)%360;}
 const target=theme==='dark'?.66:.47,c=(1-Math.abs(2*target-1))*saturation,x=c*(1-Math.abs((hue/60)%2-1)),m=target-c/2;
 const channels=hue<60?[c,x,0]:hue<120?[x,c,0]:hue<180?[0,c,x]:hue<240?[0,x,c]:hue<300?[x,0,c]:[c,0,x];
 return '#'+channels.map(v=>Math.round((v+m)*255).toString(16).padStart(2,'0')).join('');
}

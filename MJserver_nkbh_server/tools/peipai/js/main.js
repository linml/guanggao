//全局数量
var take_offset_bottom_list=[];
var leftnum=0;
var randomresult =[];
var wanrandomlist =[];
var tongrandomlist =[];
var tiaorandomlist =[];
var huarandomlist =[];
var zirandomlist =[];
var endlist = [];
//资源数组
var img_urls = [
        "./image/0.png","./image/1.png","./image/2.png","./image/3.png","./image/4.png",
        "./image/5.png","./image/6.png","./image/7.png","./image/8.png","./image/9.png",
        "./image/10.png","./image/11.png","./image/12.png","./image/13.png","./image/14.png",
        "./image/15.png","./image/16.png","./image/17.png","./image/18.png","./image/19.png",
        "./image/20.png","./image/21.png","./image/22.png","./image/23.png","./image/24.png",
        "./image/25.png","./image/26.png","./image/27.png","./image/28.png","./image/29.png",
        "./image/30.png","./image/31.png","./image/32.png","./image/33.png","./image/34.png",
        "./image/35.png","./image/36.png","./image/37.png","./image/38.png","./image/39.png",
        "./image/40.png","./image/41.png","./image/nullimg.png",
    ];
//加载初始化的方法
(function() {  
    //麻将的初始化
    // 万牌的麻将 
    var leftnum=-55;
    for(var i=18;i<=26;i++){
        leftnum +=55;
        deal_card([i],"wan",leftnum);        
   }        
    // 筒牌的麻将 
    var leftnum=-55;
    for(var i=0;i<=8;i++){
        leftnum +=55;
        deal_card([i],"tong",leftnum);
    }
     // 条牌的麻将
    var leftnum=-55;
    for(var i=9;i<=17;i++){
        leftnum +=55;
        deal_card([i],"tiao",leftnum);
    }
    // 字牌的麻将 
    var leftnum=-55;
    for(var i=27;i<=33;i++){
        leftnum +=55;
        deal_card([i],"zi",leftnum);
    } 
    // 花牌的麻将 
    var leftnum=-55;
    for(var i=34;i<=41;i++){
        leftnum +=55;
        deal_card([i],"hua",leftnum);
    }
    //万筒条字花初始化格子
    deal_card_null_top(0,8,"wan");
    deal_card_null_top(0,8,"tong");
    deal_card_null_top(0,8,"tiao");
    deal_card_null_top(0,6,"zi");
    deal_card_null_top(0,7,"hua");
    
    //东南西北初始化格子
    deal_card_null(0,12,"east");
    deal_card_null(0,12,"south");
    deal_card_null(0,12,"west");
    deal_card_null(0,12,"north");
		
    //初始化万牌数组    
    for(var i=0;i<=35;i++){
    	wanrandomlist.push(i);
    }
    //初始化筒牌数组
     for(var i=36;i<=71;i++){
    	tongrandomlist.push(i);
    }
  //初始化条牌数组
     for(var i=72;i<=107;i++){
    	tiaorandomlist.push(i);
    }
   //初始化字牌数组
    for(var i=108;i<=135;i++){
    	zirandomlist.push(i);
    }
    //初始化花牌数组
    for(var i=136;i<=143;i++){
    	huarandomlist.push(i);
    }
    //初始化空麻将
    var leftnum =-58;
    for(var i=0;i<13;i++){
    	leftnum+=58;
    	deal_card2("","east",leftnum,take_offset_bottom_list);
    	deal_card2("","south",leftnum,take_offset_bottom_list);
    	deal_card2("","west",leftnum,take_offset_bottom_list);
    	deal_card2("","north",leftnum,take_offset_bottom_list);
    }
    //为每个多选添加监听事件
    $('.select-list li input').each(function(index){
    $(this).on('click',function(){
      getrandomrestult();      
      addmask($(this).prop("checked"),$("."+(this).value+""));
    })
  })
   getrandomrestult();
   //给下方的列表添加双击事件
   $.ajax({
   	type:"get",
   	url:"http://60.205.203.40:1017/get_mj_data",
   	success:function(data){
   		$("#callbackcardlist").html("");
      if(data && data.length > 0){
        for(var i=0;i<data.length;i++){
          $("#callbackcardlist").append("<option onclick='selecttruevalue(this)'>"+data[i]+"</option>");
        }
        binddbclick();
      }
   		
   	}
   });
})();
var selectname;
  function binddbclick(){
   $("#callbackcardlist option").dblclick(function(){
    selectname = $("#callbackcardlist").val();
    selectnowname = selectname;
    $("#typetext").text(selectname)
    $.ajax({
      type:"get",
      url:"http://60.205.203.40:1017/get_mj_array",
      data:{'mj_title':selectname},
      success:function(data){ 
      	for(var i=0;i<4;i++){
	   		$(".select-list-bottom li input")[i].checked =true;
			remove_card_random();
	   	}
       randomresult =[]; 
       for(var i=0;i<data.length;i++){
            randomresult.push(parseInt(data[i]))
       }	
	   for(var j=0;j<13;j++){ 
	   	for(var i=0;i<4;i++){
	   		$(".select-list-bottom li input")[i].checked =true;
			var card = getcardtype2(parseInt(randomresult[0]));
			DeleteTopCardAlt(parseInt(randomresult[0]),card);  
	   	}
	   }
    }
   });
}); 
}
//判断是否需要添加蒙版
function addmask(flag,event){
	if(flag==true){
		event.prev().remove();
	}else{
		event.before($("<div class='mask'></div>"));
	}
}
// 加载功能-加载格子背景的功能-顶部
function deal_card_null_top(numbermin,numbermax,targetclassName){
    var targetclassName =  document.getElementsByClassName(""+targetclassName+"")[0];
     for(var i =numbermin;i<=numbermax;i++){
        var div = document.createElement("div");
        div.setAttribute("class","target-div-top");
        targetclassName.appendChild(div);
    }
}
// 加载功能-加载格子背景的功能-低部
function deal_card_null(numbermin,numbermax,targetclassName){
    var targetclassName =  document.getElementsByClassName(""+targetclassName+"")[0];
     for(var i =numbermin;i<=numbermax;i++){
        var div = document.createElement("div");
        div.setAttribute("class","target-div");
        targetclassName.appendChild(div);
    }
}
//加载功能-加载麻将-直接加载
function deal_card(number,targetclassName,leftnum){
     if(number == ""){
         number = 42;
     }
	if(targetclassName=="hua"){
		var targetclassName = document.getElementsByClassName(""+targetclassName+"")[0];
     //  var targetclassName = $("'."+targetclassName+"'");
　　　　var img = document.createElement("img");
　        img.setAttribute("class", "newImgtop"); 
       img.setAttribute("style", "left:"+leftnum+"px");
       img.setAttribute("onclick", "click_card(this)");
       img.setAttribute("alt", ""+1+"");
　　　　img.src = img_urls[number];
       targetclassName.appendChild(img);
	}else{
       var targetclassName = document.getElementsByClassName(""+targetclassName+"")[0];
　　　　var img = document.createElement("img");
　     	img.setAttribute("class", "newImgtop"); 
       img.setAttribute("style", "left:"+leftnum+"px");
       img.setAttribute("onclick", "click_card(this)");
       img.setAttribute("alt", ""+4+""); 
　　　　img.src = img_urls[number];
       targetclassName.appendChild(img);
    }
}
//加载功能-加载麻将-点击过下面的麻将有偏移量的加载
function deal_card2(number,targetclassNamepar,leftnum,take_offset_bottom_list){
     if(number == ""){
         number = 42;
     }
     if(take_offset_bottom_list.length>0){
            if(take_offset_bottom_list[clicknumber]==null){
                targetclassName = targetclassNamepar;
            } 
            var targetclassName = take_offset_bottom_list[clicknumber].line;
            var targetclassName =  document.getElementsByClassName(""+targetclassName+"")[0];
        　　var img = document.createElement("img");
        　　img.setAttribute("class", "newImg"); 
            img.setAttribute("style", "left:"+parseInt(take_offset_bottom_list[clicknumber].offestvalue));
            img.setAttribute("onclick", "click_card_remove(this)");
            img.setAttribute("onerror", "javascript:NoImage(this)");
            img.setAttribute("alt", ""+number+"");
        　　img.src = img_urls[number];
            targetclassName.appendChild(img);
     }
    else{
        var targetclassName =  document.getElementsByClassName(""+targetclassNamepar+"")[0];
        var img = document.createElement("img");
        img.setAttribute("class", "newImg");     
        img.setAttribute("style", "left:"+leftnum+"px");
        img.setAttribute("onclick", "click_card_remove(this)");
        img.setAttribute("onerror", "javascript:NoImage(this)");
        img.setAttribute("alt", ""+number+"");
        img.src = img_urls[number];
        targetclassName.appendChild(img);
    } 
}
function deal_card4(number,targetclassName,leftnum){
     if(number == ""){
         number = 42;
     }
       var targetclassName =  document.getElementsByClassName(""+targetclassName+"")[0];
        var img = document.createElement("img");
        img.setAttribute("class", "newImg");     
        img.setAttribute("style", "left:"+leftnum+"px");
        img.setAttribute("onclick", "click_card(this)");
        img.setAttribute("alt", ""+1+"");
        img.src = img_urls[number];
        targetclassName.appendChild(img);
}
//1.通过传入的参数获取随机数
function selectFrom(lowerValue, upperValue){  
    //取值范围总数  
    var choices = upperValue - lowerValue  + 1;  
    return Math.floor(Math.random() * choices + lowerValue);  
}  
//2.通过对象
//获取当前要消除的牌是属于哪个类型的牌
function getcardtype($event){
    var srcnum = getposition($event);
    if(srcnum>=18&&srcnum<=26){
        return 'wan';
    }
    if(srcnum>=0&&srcnum<=8){
        return 'tong';
    }
     if(srcnum>=9&&srcnum<=17){
        return 'tiao';
    }
    if(srcnum>=27&&srcnum<=33){
        return 'zi';
    }
    if(srcnum>=34&&srcnum<=41){
        return 'hua';
    }
}
//3.通过字母
//获取当前要消除的牌是属于哪个类型的牌
function getcardtype2(num){
    if(num>=18&&num<=26){
        return 'wan';
    }
    if(num>=0&&num<=8){
        return 'tong';
    }
     if(num>=9&&num<=17){
        return 'tiao';
    }
    if(num>=27&&num<=33){
        return 'zi';
    }
    if(num>=34&&num<=41){
        return 'hua';
    }
}
//4.根据自动生成的牌号获取到当前对象alt并减1
function DeleteTopCardAlt(num,type){
    var target_all_img1 =$("."+type+" img");
    var length = target_all_img1.length;
    for(var i=0;i<length;i++){
        if(num==getposition(target_all_img1[i])){
            click_card(target_all_img1[i]);
        }
    }
   
}
function AddTopCardAlt(num,type){
    var target_all_img1 =$("."+type+" img");
    var length = target_all_img1.length;
  if(type=="hua"){
      for(var i=0;i<8;i++){
        if(num==getposition(target_all_img1[i])){
            target_all_img1[i].alt++;
            return;
        }
        else if(getposition(target_all_img1[i])=='false'){
           var left = getoffset(num,type)-3;
            deal_card4(num,type,left);
            return
        }        
    }
  }
else if(type=="zi"){
 for(var i=0;i<7;i++){      
        if(num==getposition(target_all_img1[i])){
            target_all_img1[i].alt++;
            return;
        }else if(getposition(target_all_img1[i])=='false'){
            var left = getoffset(num,type)-3;
            deal_card4(num,type,left);
            return
        } 
        
    }
}
else{
 for(var i=0;i<9;i++){
        if(num==getposition(target_all_img1[i])){
            target_all_img1[i].alt++;
            return;
        }else if(getposition(target_all_img1[i])=='false'){
            var left = getoffset(num,type)-3;
            deal_card4(num,type,left);
            return
        } 
        
    }
} 
}
//5.获取当前麻将对象的图片的数字
function getposition($event){
    if($event!=null){
    var targetsrc1 = $event.src;
    var targetsrc2=targetsrc1.substr(targetsrc1.length-6);
     if(targetsrc2[0]=="/"){
         var targetsrc3 = targetsrc2.substr(1,1);
         return targetsrc3;
     }
     else{
          var targetsrc3 = targetsrc2.substr(0,2);
          return targetsrc3;
     } 
    }else{
        return 'false';
    }
}
//6.上面麻将返回的位置的偏移量的计算
function getoffset(numberstr,type){
   var number = parseInt(numberstr);
   if(type=="wan"){
        return (number-18)*55;
   }
   else if(type=="tong"){
        return (number)*55;
   }
   else if(type=="tiao"){
        return (number-9)*55;
   }
   else if(type=="zi"){
        return (number-27)*55;
   }
   else if(type=="hua"){
        return (number-34)*55;
   }
}    
//7.下面返回位置的偏移量
function getoffset2($event){
   return $event.style.left;
}
function cardArraylistgettrue(Arraylistarget){
	var Arraylist =[];
    	for(var i=0;i<Arraylistarget.length;i++){
			Arraylist.push(getimgtruenum(Arraylistarget[i]));
		}	
		Arraylistarget=[];
		for(var i=0;i<Arraylist.length;i++){
			Arraylistarget.push(Arraylist[i]);
	}		
	return Arraylistarget
}
//8.得到最终的麻将的数组
function alertresult(){ 
    var flag=true;   
	var name =$("#docname").val();
    //获取东南西北四个方向的图片
    var target_all_img1 =$("."+"east"+" img");
    var target_all_img2 =$("."+"south"+" img");
    var target_all_img3 =$("."+"west"+" img");
    var target_all_img4 =$("."+"north"+" img");
    if(getnullcardnum(target_all_img1)==0&&getnullcardnum(target_all_img2)==0&&getnullcardnum(target_all_img3)==0&&getnullcardnum(target_all_img4)==0)
    {
         var ma = new Object();
         ma.list=[];
        for(var i=0;i<13;i++){
            if(i<12){
                ma.list+=(getposition(target_all_img1[i])+","+getposition(target_all_img2[i])+","+getposition(target_all_img3[i])+","+getposition(target_all_img4[i])+",");
            }else{
                ma.list+=(getposition(target_all_img1[i])+","+getposition(target_all_img2[i])+","+getposition(target_all_img3[i])+","+getposition(target_all_img4[i]));
            }
        }
        if($("#docname").val()==""){
    		alert("请补全文件名");
    	}
       else{  
	       	var strs = new Array();
	       	strs = ma.list.split(",");
	       	randomresult = cardArraylistgettrue(randomresult);
            //获得总牌的数组
            var remain = getremaincardlist(strs); 
	        var cardlist =[];        
	        cardlist=strs.concat(remain);            
		    $.ajax({
			    url: 'http://60.205.203.40:1017/updata_mj',
			    type: "get",
			    data: {'mj_title':name,'mj_array':cardlist},
			    success: function (data) {
			    }
		    }) 
		    location.reload();
	    }        		        	
    }
    else{   	
        alert("请补全麻将");
    }   
}
//得到当前随机大的数组对应真实牌的号码
function getimgtruenum(num){
    if(num==0||num==9||num==18||num==27){
        return 18
    }
    else if(num==1||num==10||num==19||num==28){
        return 19
    }
    else if(num==2||num==11||num==20||num==29){
        return 20
    }
    else if(num==3||num==12||num==21||num==30){
        return 21
    }
    else if(num==4||num==13||num==22||num==31){
        return 22
    }
    else if(num==5||num==14||num==23||num==32){
        return 23
    }
     else if(num==6||num==15||num==24||num==33){
        return 24
    }
     else if(num==7||num==16||num==25||num==34){
        return 25
    }
     else if(num==8||num==17||num==26||num==35){
        return 26
    }
     else if(num==36||num==45||num==54||num==63){
        return 0
    }
     else if(num==37||num==46||num==55||num==64){
        return 1
    }
     else if(num==38||num==47||num==56||num==65){
        return 2
    }
     else if(num==39||num==48||num==57||num==66){
        return 3
    }
     else if(num==40||num==49||num==58||num==67){
        return 4
    }
     else if(num==41||num==50||num==59||num==68){
        return 5
    }
     else if(num==42||num==51||num==60||num==69){
        return 6
    }
     else if(num==43||num==52||num==61||num==70){
        return 7
    }
    else if(num==44||num==53||num==62||num==71){
        return 8
    }
    //tiao
    else if(num==72||num==81||num==90||num==99){
        return 9
    }
    else if(num==73||num==82||num==91||num==100){
        return 10
    }
    else if(num==74||num==83||num==92||num==101){
        return 11
    }
    else if(num==75||num==84||num==93||num==102){
        return 12
    }
     else if(num==76||num==85||num==94||num==103){
        return 13
    }
     else if(num==77||num==86||num==95||num==104){
        return 14
    }
    else if(num==78||num==87||num==96||num==105){
        return 15
    }
     else if(num==79||num==88||num==97||num==106){
        return 16
    }
     else if(num==80||num==89||num==98||num==107){
        return 17
    }
    //zi
     else if(num==108||num==115||num==122||num==129){
        return 27
    }
      else if(num==109||num==116||num==123||num==130){
        return 28
    }
     else if(num==110||num==117||num==124||num==131){
        return 29
    }
     else if(num==111||num==118||num==125||num==132){
        return 30
    }
      else if(num==112||num==119||num==126||num==133){
        return 31
    }
      else if(num==113||num==120||num==127||num==134){
        return 32
    }
     else if(num==114||num==121||num==128||num==135){
        return 33
    }
    //hua
    else if(num==136){
        return 34
    }
    else if(num==137){
        return 35
    }
    else if(num==138){
        return 36
    }
    else if(num==139){
        return 37
    }
    else if(num==140){
        return 38
    }
    else if(num==141){
        return 39
    }
    else if(num==142){
        return 40
    }
    else if(num==143){
        return 41
    }
}
//获取调用万筒条字的随机数
 var getrandomresult = function(count,randomCount){  
     var count = count || 10;
     var randomCount = randomCount || 3;    
     var totalArray = [],randomArray = [];
		for(var i=0;i<randomresult.length;i++){
		    totalArray.push(randomresult[i]);
		}
     for(var i=0,l=randomCount;i<l;i++){
        var randomIndex = Math.floor(Math.random()*totalArray.length);
        var selectIndex = totalArray.splice(randomIndex,1)[0];
        randomArray.push(selectIndex);    
     } 
    return randomArray;
 }
//移除空麻将的方法
function deal_card_null_remove(targetclassName){
   var target =  document.getElementsByClassName(""+targetclassName+"")[0];
   var childList = target.getElementsByTagName("img");
    var length = childList.length;
    for(var i=0;i<length;i++){
         target.removeChild(childList[0]);
    }
}
//获取当前应该添加的行,用来返回单选按钮被选中的
function getline(){
var fruitlist;
fruitlist =document.getElementsByName("Fruit");
    for(var i=0;i<fruitlist.length;i++){
        if(fruitlist[i].checked){
           return fruitlist[i].value;
        }
    }
}
//获取空麻将的数量
function getnullcardnum(event){
	var num=0;
	for(var i=0;i<event.length;i++){
		if(getposition(event[i])=='mg'){
			num++
		}
	}
	return num;
}
//获取剩下的牌的数组
function getremaincardlist(arraylist){
   var  remaincardlist = [];
	var selectinputlist = $(".select-list li input");
    for(var i=0;i<selectinputlist.length;i++){
    	if(selectinputlist[i].checked==false){
    	}else{
    		if(selectinputlist[i].value=="wan"){
    			remaincardlist = remaincardlist.concat(wanrandomlist);             
    		}
    		else if(selectinputlist[i].value=="tong"){
    			 remaincardlist = remaincardlist.concat(tongrandomlist);  			
    		}
    		else if(selectinputlist[i].value=="tiao"){
    			 remaincardlist = remaincardlist.concat(tiaorandomlist);  		
    		}
    		else if(selectinputlist[i].value=="zi"){
    			remaincardlist = remaincardlist.concat(zirandomlist); 
    			
    		}else if(selectinputlist[i].value=="hua"){
    			remaincardlist = remaincardlist.concat(huarandomlist);
    		}
    	}
    }   
    remaincardlist =  cardArraylistgettrue(remaincardlist);
    for(var i=0;i<arraylist.length;i++){
         remaincardlist.splice($.inArray(parseInt(arraylist[i]), remaincardlist), 1);
    }
    return remaincardlist;
}
//获取总牌的数量
function getrandomrestult(){
	randomresult = [];
	var selectinputlist = $(".select-list li input");
    for(var i=0;i<selectinputlist.length;i++){
    	if(selectinputlist[i].checked==false){
    	}else{
    		if(selectinputlist[i].value=="wan"){
    			randomresult = randomresult.concat(wanrandomlist);             
    		}
    		else if(selectinputlist[i].value=="tong"){
    			 randomresult = randomresult.concat(tongrandomlist);  			
    		}
    		else if(selectinputlist[i].value=="tiao"){
    			 randomresult = randomresult.concat(tiaorandomlist);  		
    		}
    		else if(selectinputlist[i].value=="zi"){
    			randomresult = randomresult.concat(zirandomlist); 
    			
    		}else if(selectinputlist[i].value=="hua"){
    			randomresult = randomresult.concat(huarandomlist);
    		}
    	}
    }
}
$(function(){
  $('.select-list li input').each(function(index){
    $(this).on('click',function(){
      getrandomrestult();
    })
  })
})
//自动配牌当前行
function deal_card_random(){
    var className = getline();
    var target_all_img =$("."+className+" img");
    var randomnum =getnullcardnum(target_all_img);
    //获取当前行
    var targeline = getline(); 
    var leftnum1=-58;    
    if(getnullcardnum(target_all_img)==0){
    	alert("已经满了,不能添加了");
    } 
   else if(randomresult.length<randomnum){
    	alert("牌数不足配置一行请重新添加");
    }
    else{
	  for(var i=0;i<randomnum;i++){ 
	    leftnum1 +=58;
	    var truenum = getimgtruenum(getrandomresult(randomresult.length,randomnum)[i]);		
	     //获取到生成的随机数下标的对象的alt的值进行移除  
		 var card = getcardtype2(truenum); 	
		 DeleteTopCardAlt(truenum,card);
	  } 
	}                                    
}
//删除配牌的行
function remove_card_random(){
     //获取当前行
     var targeline = getline();
     var target_all_img =$("."+targeline+" img");    
     for(var i=0;i<target_all_img.length;i++){
     	if(getposition(target_all_img[i])=='mg'){
    	}
        else{
        	click_card_remove(target_all_img[i]);
        }
     }
    leftnum =0;
}
//顶部的麻将当点击一次或者多次的时候消失
    function click_card($event){ 
        //获取到当前的alt值并进行加减
        var nowaltnumber = parseInt($event.alt);
        $event.alt =nowaltnumber-1;
        var targetsrc3 = getposition($event);
        var className = getline();
        var target_all_img =$("."+className+" img"); 
        if(getnullcardnum(target_all_img)!=0){
	        if($event.alt ==0){
	        	$event.remove()
	        }
            if($event.alt< 0){
                 $event.alt = 0;
                 $event.remove()
            }
	        //插空加载       
	        for(var i=0;i<target_all_img.length;i++){        	
	        	if(getposition(target_all_img[i])=='mg'){
	        		target_all_img[i].src=$event.src;                                       
	                randomresult.splice($.inArray(parseInt(targetsrc3),randomresult), 1);  
                   // randomresult.splice($.inArray(targetsrc3,randomresult), 1);  
                   // endlist.splice($.inArray(parseInt(targetsrc3), endlist), 1);   
                    
		            if(nowaltnumber==1){              
		                $event.remove();
		            } 
		            return
	        	}
	        }
        }else{
        	alert("已经满了");
        }
    }
function submitdata()
{	
    var roomid = $("#roomid").val();
    var cardtype = $("#cardtype").val();
    var textvalue = $("#textvalue").is(':checked');
    if(textvalue ==false){
    	textvalue =0;
    }
    else if(textvalue == true){
    	textvalue = 1;
    }
    $.ajax({
   	type:"get",
   	url:"http://60.205.203.40:1017/updata_mj_type",
    data:{"roomId":roomid,"mj_title":selectname,"switch_code":textvalue},
   	success:function(data){
   	 console.log(data)
      var str = data; 
      var obj = JSON.parse(str);
        if(obj['code'] == '0'){
            alert("提交成功");
        }
        else if(obj['code'] == '101'){
            alert("该房间号已经提交过了");
        }
        else{
            alert("提交失败");
        }
   	},
    err:function(obj){
      console.log(obj);
    }
   });
    location.reload();
}
//给下面的麻将添加点击删除事件
function click_card_remove(event)
{ 
	var className = getline();
    var target_all_img =$("."+className+" img");
    var srcnumber =getposition(event);
    var flag =true;      		
    //获得当前点击事件的行
    var cardclidkline = $(event).parent("li").attr('class');
    //获取到当前点击下标的对象的alt的值进行移除   
    randomresult.push(parseInt(srcnumber));
    //获取到当前点击下标的对象的alt的值进行移除
    var type = getcardtype(event);            
    AddTopCardAlt(srcnumber,type); 
    event.src ="./image/nullimg.png";
}
function checknum($event){
    leftnum =0;
}
var selectnowname;
function selecttruevalue(event){
	selectnowname = event.value;
}
function remove(){
  var r=confirm("您确定要删除"+selectnowname+"吗？");
    if (r==true)
    {
        $.ajax({
		type:"get",
		url:"http://60.205.203.40:1017/del_mj_data",
		data:{'mj_title':selectnowname},
		async:true,
		success:function(data){
            console.log(data)
			if(data.code == 0){
                 alert("删除成功");
                 location.reload();
            }
		}
	    });
    }
    else
    {
    }
}
//当图片显示报错的时候
function NoImage(imgObject){ 
     imgObject.src = "./image/nullimg.png";
} 


var baseUrl = 'https://rest.ehrscape.com/rest/v1';
var queryUrl = baseUrl + '/query';

var username = "ois.seminar";
var password = "ois4fri";

/**
 * Prijava v sistem z privzetim uporabnikom za predmet OIS in pridobitev
 * enolične ID številke za dostop do funkcionalnosti
 * @return enolični identifikator seje za dostop do funkcionalnosti
 */
function getSessionId() {
    var response = $.ajax({
        type: "POST",
        url: baseUrl + "/session?username=" + encodeURIComponent(username) +
                "&password=" + encodeURIComponent(password),
        async: false
    });
    return response.responseJSON.sessionId;
}

function ustvariEhr() {
    //alert("im here");
    sessionId = getSessionId();

	var ime = $("#kreirajIme").val();
	var priimek = $("#kreirajPriimek").val();
	var datumRojstva = $("#kreirajDatumRojstva").val();

	if (!ime || !priimek || !datumRojstva || ime.trim().length == 0 ||
      priimek.trim().length == 0 || datumRojstva.trim().length == 0) {
		$("#kreirajSporocilo").html("<br><span class='obvestilo label " +
      "label-warning fade-in'>Prosim vnesite zahtevane podatke!</span>");
	} else {
		$.ajaxSetup({
		    headers: {"Ehr-Session": sessionId}
		});
		$.ajax({
		    url: baseUrl + "/ehr",
		    type: 'POST',
		    success: function (data) {
		        var ehrId = data.ehrId;
		        var partyData = {
		            firstNames: ime,
		            lastNames: priimek,
		            dateOfBirth: datumRojstva,
		            partyAdditionalInfo: [{key: "ehrId", value: ehrId}]
		        };
		        $.ajax({
		            url: baseUrl + "/demographics/party",
		            type: 'POST',
		            contentType: 'application/json',
		            data: JSON.stringify(partyData),
		            success: function (party) {
		                if (party.action == 'CREATE') {
		                    $("#kreirajSporocilo").html("<br><span class='obvestilo " +
                          "label label-success fade-in'>Uspešno kreiran EHR '" +
                          ehrId + "'.</span>");
		                    $("#dodajVitalnoEHR").val(ehrId);
		                }
		            },
		            error: function(err) {
		            	$("#kreirajSporocilo").html("<br><span class='obvestilo label " +
                    "label-danger fade-in'>Napaka '" +
                    JSON.parse(err.responseText).userMessage + "'!");
		            }
		        });
		    }
		});
	}
}

function dodajMeritveVitalnihZnakov() {
	sessionId = getSessionId();

	var ehrId = $("#dodajVitalnoEHR").val();
	var datumInUra = $("#dodajVitalnoDatumInUra").val();
	var telesnaVisina = $("#dodajVitalnoTelesnaVisina").val();
	var telesnaTeza = $("#dodajVitalnoTelesnaTeza").val();
	var telesnaTemperatura = $("#dodajVitalnoTelesnaTemperatura").val();
	var sistolicniKrvniTlak = $("#dodajVitalnoKrvniTlakSistolicni").val();
	var diastolicniKrvniTlak = $("#dodajVitalnoKrvniTlakDiastolicni").val();
	//var nasicenostKrviSKisikom = $("#dodajVitalnoNasicenostKrviSKisikom").val();

	if (!ehrId || ehrId.trim().length == 0) {
		$("#dodajMeritveVitalnihZnakovSporocilo").html("<span class='obvestilo " +
      "label label-warning fade-in'>Prosim vnesite zahtevane podatke!</span>");
	} else {
		$.ajaxSetup({
		    headers: {"Ehr-Session": sessionId}
		});
		var podatki = {
			// Struktura predloge je na voljo na naslednjem spletnem naslovu:
      // https://rest.ehrscape.com/rest/v1/template/Vital%20Signs/example
		    "ctx/language": "en",
		    "ctx/territory": "SI",
		    "ctx/time": datumInUra,
		    "vital_signs/height_length/any_event/body_height_length": telesnaVisina,
		    "vital_signs/body_weight/any_event/body_weight": telesnaTeza,
		   	"vital_signs/body_temperature/any_event/temperature|magnitude": telesnaTemperatura,
		    "vital_signs/body_temperature/any_event/temperature|unit": "°C",
		    "vital_signs/blood_pressure/any_event/systolic": sistolicniKrvniTlak,
		    "vital_signs/blood_pressure/any_event/diastolic": diastolicniKrvniTlak,
		    //"vital_signs/indirect_oximetry:0/spo2|numerator": nasicenostKrviSKisikom
		};
		var parametriZahteve = {
		    ehrId: ehrId,
		    templateId: 'Vital Signs',
		    format: 'FLAT',
		    //committer: merilec
		};
		$.ajax({
		    url: baseUrl + "/composition?" + $.param(parametriZahteve),
		    type: 'POST',
		    contentType: 'application/json',
		    data: JSON.stringify(podatki),
		    success: function (res) {
		        $("#dodajMeritveVitalnihZnakovSporocilo").html(
              "<span class='obvestilo label label-success fade-in'>" +
              res.meta.href + ".</span>");
              preberiEHRodBolnika();
		    },
		    error: function(err) {
		    	$("#dodajMeritveVitalnihZnakovSporocilo").html(
            "<span class='obvestilo label label-danger fade-in'>Napaka '" +
            JSON.parse(err.responseText).userMessage + "'!");
		    }
		});
	}
}

function preberiEHRodBolnika() {
	sessionId = getSessionId();

	var ehrId = $("#dodajVitalnoEHR").val();
	var podatkiZaSeznam;
		$.ajax({
			url: baseUrl + "/demographics/ehr/" + ehrId + "/party",
			type: 'GET',
			headers: {"Ehr-Session": sessionId},
	    	success: function (data) {
				var party = data.party;
				podatkiZaSeznam = ehrId+ " -> " + party.firstNames + " " + party.lastNames;
				var pogoj = false;
				var x = document.getElementById("select1");
				for (i = 0; i < x.length; i++) {
          if(x.options[i].text == podatkiZaSeznam) {
            pogoj = true;
          }
        }
        if(pogoj == false) {
    		  var option = document.createElement("option");
    		  option.text = podatkiZaSeznam;
    		  x.add(option, x[1]);
        }
	    }
		});
}

function prikaziGraf() {
  sessionId = getSessionId();

  var x = document.getElementById("select1").value;
  x = x.split(" ");
  var ehrId = x[0];
  //var ehrId = $("#dodajVitalnoEHR").val();
  //var tabelaD = [];
  //var tabelaS = [];
  //var datum = [];
  
  var chartData = [];

  $.ajax({
    url: baseUrl + "/view/" + ehrId + "/blood_pressure",
    type: 'GET',
    headers: {
        "Ehr-Session": sessionId
    },
    success: function (res) {
        res.forEach(function (el, i, arr) {
            //tabelaD.push(el.diastolic);
            //tabelaS.push(el.systolic);
            //datum.push(el.time.substring(0,10)+"\n"+el.time.substring(11,16));
            // sporocilo
            var sporociloD = "";
            var sporociloS = "";
            if(el.diastolic <= 60) {
              sporociloD = "Nizek";
            } else if(el.systolic <= 90) {
              sporociloS = "Nizek";
            } else if(el.diastolic >= 90) {
              sporociloD = "Visok. Posvetujte se z zdravnikom.";
            } else if(el.systolic >= 140) {
              sporociloS = "Visok. Posvetujte se z zdravnikom.";
            } else if(el.systolic >= 86 && el.systolic <=124 && el.diastolic >= 60 && el.diastolic <= 84) {
              sporociloS = "Idealno."
            } else if(el.systolic >= 120 && el.systolic <=140 && el.diastolic >= 80 && el.diastolic <= 90) {
              sporociloS = "Priporoceno izvajanje aktivnosti in zdrava prehrana.";
            } else if(el.systolic >= 140 && el.diastolic >= 90) {
              sporociloS = "Jemljite zdravila in se posvetujte z zdravnikom!";
            } 
        
            chartData.push({
                "systolic" : el.systolic-el.diastolic,
                "diastolic" : el.diastolic,
                "datum" : el.time.substring(0,10)+"\n"+el.time.substring(11,16),
                balloonTextField: el.diastolic+" "+sporociloD,
                balloonTextSMS: el.systolic+" "+sporociloS,
            });
        });

  var chart = AmCharts.makeChart( "chartdiv", {
    "type": "serial",
    "theme": "light",
    "dataProvider": chartData.reverse(),
  /*"gridAboveGraphs": true,
  "startDuration": 1,
  "graphs": [ {
    "color": "#FF0F00",
    "fillAlphas": 0.8,
    "lineAlpha": 0.2,
    "type": "column",
    "valueField": "diastolic"
  } ],
    "chartCursor": {
    "categoryBalloonEnabled": false,
    "cursorAlpha": 0,
    "zoomable": false
  },
  "categoryField": "mesec",
  "categoryAxis": {
    "gridPosition": "start",
    "gridAlpha": 0,
    "tickPosition": "start",
    "tickLength": 20
  },
  "export": {
    "enabled": true
  }*/
  "valueAxes": [{
    "stackType": "regular",
    "axisAlpha": 0.3,
    "gridAlpha": 0,
    "title": "Krvni tlak [mm Hg]"
  }],
  "startDuration": 1,
  "graphs": [{
    "balloonText": "<b>[[balloonTextField]]</b>",
    "color": "#FF0000",
    "fillAlphas": 0.9,
    "lineAlpha": 0.2,
    "type": "column",
    "valueField": "diastolic",
  },{
    "balloonText": "<b>[[balloonTextSMS]]</b>",
    "fillAlphas": 0.8,
    "lineAlpha": 0.3,
    "type": "column",
	  "color": "#FF0000",
    "valueField": "systolic"
  }],
  "chartCursor": {
    "categoryBalloonEnabled": false,
    "cursorAlpha": 0,
    "zoomable": false
  },
  "categoryField": "datum",
  "categoryAxis": {
    "gridPosition": "start",
    "labelRotation": 45
  },
  "balloon": {
    "enabled": true
  },
  "export": {
    "enabled": true
  }
});

	}
});

}

function masterDetail() {
  sessionId = getSessionId();
  var x = document.getElementById("select1").value;
  x = x.split(" ");
  var ehrId = x[0];
  
  var tip = document.getElementById("select2").value;
  console.log(tip);
  if(tip == "Teza") {
  $.ajax({
    url: baseUrl + "/view/" + ehrId + "/weight",
    type: 'GET',
    headers: {
        "Ehr-Session": sessionId
    },
    success: function (res) {
        /*for (var i in res) {
          console.log(res[i]);
            //$("#teza").html("<span>Teza: "+res[i].time + ': ' + res[i].weight + res[i].unit + "</span><br>");
            $("#teza").html("<span>Teza: "+ res[i].weight + res[i].unit + " Datum in čas: "+res[i].time +"</span><br>");
        }*/
        if (res.length > 0) {
						    	var results = "<table class='table table-striped " +
                    "table-hover'><tr><th>Datum in ura</th>" +
                    "<th class='text-right'>Telesna teža</th></tr>";
						        for (var i in res) {
						            results += "<tr><td>" + res[i].time.substring(0,10) + "; " + res[i].time.substring(11,16) +
                          "</td><td class='text-right'>" + res[i].weight + " " 	+
                          res[i].unit + "</td>";
						        }
						        results += "</table>";
						        $("#izpis").html(results);
          }
      }  
  });
  
  } else if(tip == "Temperatura"){
    
  $.ajax({
  			url: baseUrl + "/view/" + ehrId + "/" + "body_temperature",
					    type: 'GET',
					    headers: {"Ehr-Session": sessionId},
					    success: function (res) {
					    	if (res.length > 0) {
						    	var results = "<table class='table table-striped " +
                    "table-hover'><tr><th>Datum in ura</th>" +
                    "<th class='text-right'>Telesna temperatura</th></tr>";
						        for (var i in res) {
						            results += "<tr><td>" + res[i].time.substring(0,10) + "; " + res[i].time.substring(11,16) +
                          "</td><td class='text-right'>" + res[i].temperature +
                          " " + res[i].unit + "</td>";
						        }
						        results += "</table>";
						        $("#izpis").html(results);
					    	}
					    }
  }); 
  
  }
}

/**
 * Generator podatkov za novega pacienta, ki bo uporabljal aplikacijo. Pri
 * generiranju podatkov je potrebno najprej kreirati novega pacienta z
 * določenimi osebnimi podatki (ime, priimek in datum rojstva) ter za njega
 * shraniti nekaj podatkov o vitalnih znakih.
 * @param stPacienta zaporedna številka pacienta (1, 2 ali 3)
 * @return ehrId generiranega pacienta
 */
function generiraj() {
  generirajPodatke(1);
  generirajPodatke(2);
  generirajPodatke(3);
} 
 
function generirajPodatke(stPacienta) {
  ehrId = "";

  // TODO: Potrebno implementirati
  sessionId = getSessionId();

  if(stPacienta === 1) {
	  var ime = "Maja"
	  var priimek = "Kosir"
	  var datumRojstva = "1948-02-05";
	  var ehrId = "d21a38ec-71ce-46b7-9333-7cd1962586bb";
	  //upokojenka
  } else if(stPacienta === 2) {
    var ime = "Jakob"
    var priimek = "Novak"
    var datumRojstva = "1988-7-15";
    var ehrId = "2d5bfb0c-e357-4e06-96b9-f5fe0eb0948c";
    //športnik
  } else {
    var ime = "Muri"
    var priimek = "Janer"
    var datumRojstva = "1974-12-12"
    var ehrId = "622e7e21-1c87-40e3-be3b-3dc95aca8200";
    //pacient s težavami
  }
 
		$.ajaxSetup({
		    headers: {"Ehr-Session": sessionId}
		});
		$.ajax({
		    url: baseUrl + "/ehr",
		    type: 'POST',
		    success: function (data) {
		        var ehrId = data.ehrId;
		        var partyData = {
		            firstNames: ime,
		            lastNames: priimek,
		            dateOfBirth: datumRojstva,
		            partyAdditionalInfo: [{key: "ehrId", value: ehrId}]
		        };
		        $.ajax({
		            url: baseUrl + "/demographics/party",
		            type: 'POST',
		            contentType: 'application/json',
		            data: JSON.stringify(partyData),
		            success: function (party) {
		                if (party.action == 'CREATE') {
		                    var x = document.getElementById("select1");
    		                var option = document.createElement("option");
    		                option.text = ehrId;
    		                x.add(option, x[1]); 
		                }
		            }
		        });
		        
	          shraniPodatke(ehrId, function() {
	            var compositionData = {
              "ctx/time": "2016-3-19T13:10Z",
              "ctx/language": "en",
              "ctx/territory": "CA",
              "vital_signs/body_temperature/any_event/temperature|magnitude": 36 + Math.floor(Math.random()*2),
              "vital_signs/body_temperature/any_event/temperature|unit": "°C",
              "vital_signs/blood_pressure/any_event/systolic": 100 + Math.floor(Math.random()*50),
              "vital_signs/blood_pressure/any_event/diastolic": 60 + Math.floor(Math.random()*40),
              "vital_signs/height_length/any_event/body_height_length": 171 + Math.floor(Math.random()*22),
              "vital_signs/body_weight/any_event/body_weight": 57.2 + Math.floor(Math.random()*30),
              };
              var queryParams = {
              ehrId: ehrId,
          		templateId: 'Vital Signs',
          		format: 'FLAT',
              //committer: 'Belinda Nurse'
              };
              $.ajax({
              url: baseUrl + "/composition?" + $.param(queryParams),
              type: 'POST',
              contentType: 'application/json',
              data: JSON.stringify(compositionData),
              success: function (res) {
                  //console.log("uspeh "+res);
                }
              });
	          });
		    }
		});

  return "0";
}

function shraniPodatke(ehrId, callback) {
  for(var i=1; i<8; i++) {
    callback(ehrId);
  }
}

// TODO: Tukaj implementirate funkcionalnost, ki jo podpira vaša aplikacija
function pocistiPolja() {
    document.getElementById('kreirajIme').value='';
    document.getElementById('kreirajPriimek').value='';
    document.getElementById('kreirajDatumRojstva').value='';
}    

function pocistiPolja2() {
    document.getElementById('dodajVitalnoEHR').value='';
    document.getElementById('dodajVitalnoDatumInUra').value='';
    document.getElementById('dodajVitalnoTelesnaVisina').value='';
    document.getElementById('dodajVitalnoTelesnaTeza').value='';
    document.getElementById('dodajVitalnoTelesnaTemperatura').value='';
    document.getElementById('dodajVitalnoKrvniTlakSistolicni').value='';
    document.getElementById('dodajVitalnoKrvniTlakDiastolicni').value='';
}    

function izberiOsebo() {
  sessionId = getSessionId();
  var x = document.getElementById("select1").value;
  x = x.split(" ");
  var ehrId = x[0];
  
  $("#dodajVitalnoEHR").val(ehrId);
  
  var searchData = [
    {key: "ehrId", value: ehrId}
  ];
  $.ajax({
    url: baseUrl + "/demographics/party/query",
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(searchData),
    success: function (res) {
        //$("#header").html("Search by ehrId " + ehrId);
        for (i in res.parties) {
            var party = res.parties[i];
            $("#ime").html("<span>"+party.firstNames + ' ' + party.lastNames + ' [' 
              + party.dateOfBirth.substring(0,10) + "] </span><br>");
        }
    }
  });
  $.ajax({
    url: baseUrl + "/demographics/ehr/" + ehrId + "/party",
    type: 'GET',
    headers: {
        "Ehr-Session": sessionId
    },
    success: function (data) {
        var party = data.party;
    }
  });
  
  prikaziGraf();
}

var map;
function initMap() {

  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: -33.867, lng: 151.195},
    zoom: 12
  });

  var infoWindow = new google.maps.InfoWindow({map: map});

  // Try HTML5 geolocation.
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      //infoWindow.setPosition(pos);
      //infoWindow.setContent('Location found.');
      map.setCenter(pos);
      infowindow = new google.maps.InfoWindow();
      var service = new google.maps.places.PlacesService(map);
        service.nearbySearch({
        location: pos,
        radius: 20000,
        types: ['hospital','pharmacy']
      }, callback);
      
    }, function() {
      handleLocationError(true, infoWindow, map.getCenter());
    });
  } else {
    // Browser doesn't support Geolocation
    handleLocationError(false, infoWindow, map.getCenter());
  }
}

function callback(results, status) {
  if (status === google.maps.places.PlacesServiceStatus.OK) {
    for (var i = 0; i < results.length; i++) {
      createMarker(results[i]);
    }
  }
}

function createMarker(place) {
  var placeLoc = place.geometry.location;
  var marker = new google.maps.Marker({
    map: map,
    position: place.geometry.location
  });

  google.maps.event.addListener(marker, 'click', function() {
    infowindow.setContent(place.name);
    infowindow.open(map, this);
  });
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  infoWindow.setPosition(pos);
  infoWindow.setContent(browserHasGeolocation ?
    'Error: The Geolocation service failed.' :
    'Error: Your browser doesn\'t support geolocation.');
}
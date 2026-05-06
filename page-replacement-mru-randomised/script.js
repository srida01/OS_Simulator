var numberOfFrames, dropDown, inputString, numberOfPages, pageFaults, pageHits = 0, s = false, missRate, hitRate;
var arr = new Array();

function visualize() {
	var table = document.getElementById("tbl");
	document.getElementById('SUM').style.display = "none";
	table.innerHTML = "<thead></thead><tbody></tbody>";
	pageHits = 0;
	inputString = document.getElementById("input_string").value;
	if(inputString==""){
		alert("Please enter page stream");
		return;
	}
	arr = inputString.split(' ').map(Number);
	numberOfPages = arr.length;
	if(isNaN(numberOfPages)){
		alert("Please enter page stream");
		return;
	}
	if(inputString.includes('-')){
		alert("Please enter positive page numbers");
		return;
	}
	numberOfFrames = parseInt(document.getElementById("frame_size").value);
	if(isNaN(numberOfFrames)){
		alert("Please choose number of frames to be at least 1");
		return;
	}
	if (numberOfFrames <= 0) {
		alert("Please choose number of frames to be at least 1");
		return;
	}
	dropDown = document.getElementById("drop_down").value;
	var temp = new Array();
	for (let o = 0; o < numberOfFrames; o++) {
		temp[o] = -1;
	}
	if (dropDown=="MRU"||dropDown=="Random") {
		var row = table.insertRow(0);
		for (let j = 0; j <= (numberOfFrames + 1); j++) {
			var cell = row.insertCell(j);
			if (j == 0)
				cell.innerHTML = "<b>Page Sequence</b>";
			else if (j == (numberOfFrames + 1))
				cell.innerHTML = "<b>Page Hit/Miss</b>";
			else
				cell.innerHTML = `<b>Frame ${j}</b>`;
		}
		if (dropDown == "MRU") {
			var last = new Array();
			for (let j = 0; j < numberOfFrames; j++)
				last[j] = numberOfPages + 1;
			for (let m = 0; m < numberOfPages; m++) {
				let n;
				for (n = 0; n < numberOfFrames; n++) {
					if (arr[m] == temp[n]) {
						s = true;
						pageHits++;
						last[n] = m;
						break;
					}
				}
				if (!s) {
					let l = 0;
					for (let j = 0; j < numberOfFrames; j++)
						if (last[l] < last[j])
							l = j;
					temp[l] = arr[m];
					last[l] = m;
				}
				row = table.insertRow(m + 1);
				cell = row.insertCell(0);
				cell.innerHTML = arr[m];
				for (n = 0; n < numberOfFrames; n++) {
					cell = row.insertCell(n + 1);
					cell.innerHTML = temp[n] >= 0 ? temp[n] : " - ";
				}
				cell = row.insertCell(numberOfFrames + 1);
				if (s) {
					cell.innerHTML = "Hit";
					cell.style.backgroundColor = "rgb(0, 102, 0)";
				}
				else {
					cell.innerHTML = "Miss";
					cell.style.backgroundColor = "rgb(102, 0, 0)";
				}
				s = false;
			}
		}
		else if(dropDown == "Random"){
			let x = 0;
			for (let m = 0; m < numberOfPages; m++) {
				let n;
				for (n = 0; n < numberOfFrames; n++) {
					if (arr[m] == temp[n]) {
						s = true;
						pageHits++;
						break;
					}
				}
				if (!s) {
					if (x < numberOfFrames)
						temp[x++] = arr[m];
					else {
						let l = Math.floor(Math.random() * numberOfFrames);
						temp[l] = arr[m];
					}
				}
				row = table.insertRow(m + 1);
				cell = row.insertCell(0);
				cell.innerHTML = arr[m];
				for (n = 0; n < numberOfFrames; n++) {
					cell = row.insertCell(n + 1);
					cell.innerHTML = temp[n] >= 0 ? temp[n] : " - ";
				}
				cell = row.insertCell(numberOfFrames + 1);
				if (s) {
					cell.innerHTML = "Hit";
					cell.style.backgroundColor = "rgb(0, 102, 0)";
				}
				else {
					cell.innerHTML = "Miss";
					cell.style.backgroundColor = "rgb(102, 0, 0)";
				}
				s = false;
			}
		}
		pageFaults = numberOfPages - pageHits;
		hitRate = (pageHits / numberOfPages) * 100;
		missRate = (pageFaults / numberOfPages) * 100;
		document.getElementById("page_miss").innerHTML = "Number Of Page Faults : " + `<b>${pageFaults}</b>`;
		document.getElementById("page_hits").innerHTML = "Number Of Page Hits : " + `<b>${pageHits}</b>`;
		document.getElementById("miss_rate").innerHTML = "Page Miss Rate : " + `<b>${missRate.toFixed(2)}%</b>`;
		document.getElementById("hit_rate").innerHTML = "Page Hit Rate : " + `<b>${hitRate.toFixed(2)}%</b>`;
		document.getElementById('SUM').style.display = "block";
	}
	else {
		alert("Please choose a valid algorithm");
		return;
	}
}
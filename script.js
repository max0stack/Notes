const textEl = document.querySelector("textarea#text")
const dateEl = document.querySelector("input#date")
const timeEl = document.querySelector("input#time")
const notesEl = document.querySelector("#notes")

const today = new Date();
const todayDate = `${today.getFullYear()}-0${today.getMonth()}-${today.getDate()}`
const todayTime = `${today.getHours()}:${today.getMinutes}`

dateEl.value = todayDate
timeEl.value = todayTime

const notes = JSON.parse(localStorage.getItem("notes")) || []

printsNotes(notes)

function createNote(){
    const noteText = textEl.value 
    const noteDate = dateEl.value 
    const noteTime = timeEl.value

    const note = {
        noteText,
        noteDate,
        noteTime,
    }
    
    notes.push(note)
    
    localStorage.setItem("notes",JSON.stringify(notes))


    printsNotes(notes)
    
      textEl.innerHTML = ''
      dateEl.innerHTML = todayDate
      timeEl.innerHTML = todayTime
    
}


function printsNotes(notes){
    notesEl.innerHTML = ''
    notes.forEach(function (note, index) {
        notesEl.innerHTML += `
        <div class="note">
            <div id="text">
                ${note.noteText}
            </div>
            <div id="date">
                ${note.noteDate}
            </div>
            <div id="time">
                ${note.noteTime}
            </div>
            <button onclick="deleteNotes(${index})">X</button>
        </div>
        `
     
    });
}

function deleteNotes(index){
    notes.splice(index, 1);
    localStorage.setItem("notes",JSON.stringify(notes));
    printsNotes(notes);
}
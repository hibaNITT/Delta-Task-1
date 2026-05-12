// Create an object to store all the game sounds
const sounds = {
  click: new Audio("./sounds/mixkit-cartoon-toy-whistle-616.wav"),
  explosion: new Audio("./sounds/mixkit-cinematic-laser-gun-thunder-1287.wav"),
  gameover: new Audio("./sounds/mixkit-small-group-cheer-and-applause-518.wav"),
  teleport: new Audio("./sounds/mixkit-cartoon-toy-whistle-616.wav"),
  powerup: new Audio("./sounds/mixkit-small-group-cheer-and-applause-518.wav"),
};

// Set the volume for each sound (0 to 1, where 1 = 100%)
sounds.click.volume = 1;
sounds.explosion.volume = 1;
sounds.gameover.volume = 1;
sounds.teleport.volume = 1;
sounds.powerup.volume = 0.7; // Make powerup sound quieter (70%)

// Make the click sound play faster than normal
sounds.click.playbackRate = 1.75;

// Function to play a sound by name
// Call this with playSound("click") or playSound("explosion")
export function playSound(soundName) {
  // Check if the sound exists
  if (sounds[soundName]) {
    // Start the sound from the beginning (in case it's playing)
    sounds[soundName].currentTime = 0;

    // Play the sound
    sounds[soundName].play().catch((err) => {
      // If sound fails to play, just log the error
      console.log("Sound play failed:", err);
    });
  }
}

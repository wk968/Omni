const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { QueryType } = require("discord-player");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("play")
		.setDescription("Play a song")
		.addSubcommand(subcommand =>
			subcommand
				.setName("search")
				.setDescription("Search for a song and play")
				.addStringOption(option =>
					option.setName("searchterms").setDescription("Search keywords").setRequired(true)
				)
		)
        .addSubcommand(subcommand =>
			subcommand
				.setName("playlist")
				.setDescription("Plays a playlist")
				.addStringOption(option => option.setName("url").setDescription("The playlist's URL").setRequired(true))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName("song")
				.setDescription("Plays a song with link")
				.addStringOption(option => option.setName("url").setDescription("The song's URL").setRequired(true))
		),
	execute: async ({ client, interaction }) => {

        // Make sure the user is inside a voice channel
		if (!interaction.member.voice.channel) return interaction.reply("You need to be in a voice channel to play a song.");

        // Create a play queue for the server
		const queue = await client.player.queues.create(interaction.guild);

        // Wait until you are connected to the channel
		if (!queue.connection) {
            try {
                await queue.connect(interaction.member.voice.channel);
            } catch (err) {
                console.error("Connection error:", err);
                return interaction.editReply("Could not connect to the voice channel.");
            }
        }

		let embed = new EmbedBuilder();

		if (interaction.options.getSubcommand() === "song") {

            let url = interaction.options.getString("url")
            // Search for the song using the discord-player
            const result = await client.player.search(url, {
                requestedBy: interaction.user,
                searchEngine: QueryType.YOUTUBE_VIDEO
            });
            // finish if no tracks were found
            if (result.tracks.length === 0)
                return interaction.reply("No results")

            // Add the track to the queue
            const song = result.tracks[0];
            await queue.addTrack(song);
        
            embed
                .setDescription(`**[${song.title}](${song.url})** has been added to the Queue`)
                .setThumbnail(song.thumbnail)
                .setFooter({ text: `Duration: ${song.duration}`});

		}
        else if (interaction.options.getSubcommand() === "playlist") {

            // Search for the playlist using the discord-player
            let url = interaction.options.getString("url");
            const result = await client.player.search(url, {
                requestedBy: interaction.user,
                searchEngine: QueryType.YOUTUBE_PLAYLIST
            });

            if (result.tracks.length === 0)
                return interaction.reply(`No playlists found with ${url}`)
            
            // Add the tracks to the queue
            const playlist = result.playlist;
            await queue.addTracks(result.tracks);
            embed
                .setDescription(`**${result.tracks.length} songs from [${playlist.title}](${playlist.url})** have been added to the Queue`)
                .setThumbnail(playlist.thumbnail)

		} 
        else if (interaction.options.getSubcommand() === "search") {
            // Search for the song using the discord-player
            let url = interaction.options.getString("searchterms")
            const result = await client.player.search(url, {
                requestedBy: interaction.user,
                searchEngine: QueryType.AUTO
            })

            // finish if no tracks were found
            if (result.tracks.length === 0)
                return interaction.editReply("No results");
            
            // Add the track to the queue
            const song = result.tracks[0];
            await queue.addTrack(song);
            embed
                .setDescription(`**[${song.title}](${song.url})** has been added to the Queue`)
                .setThumbnail(song.thumbnail)
                .setFooter({ text: `Duration: ${song.duration}`})
		}
        // Play the song
        try {
            // Check if the queue has tracks and play if not already playing
            if (!queue.current) {
                await queue.node.play();
            }
        } catch (error) {
            console.error("Error while trying to play:", error);
            return interaction.editReply("Failed to play the track.");
        }

        // Respond with the embed containing information about the player
        await interaction.reply({
            embeds: [embed]
        })
	},
}

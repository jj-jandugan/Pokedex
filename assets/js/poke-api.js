const pokeApi = {}

function formatStatName(statName) {
    return statName
        .split('-')
        .map(word => {
            if (word === 'special') return 'Sp.';
            return word.toLowerCase() === 'hp' ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
}

pokeApi.getPokemonSpecies = (speciesUrl) => {
    return fetch(speciesUrl)
        .then(response => {
            if (!response.ok) {
                console.error(`Species fetch failed: ${response.status} for ${speciesUrl}`);
                return null;
            }
            return response.json();
        })
        .then(speciesData => {
            if (!speciesData) return 'No description available.';
            const flavorEntry = speciesData.flavor_text_entries.find(
                entry => entry.language.name === 'en'
            );
            return flavorEntry ? flavorEntry.flavor_text.replace(/[\n\f\r]/g, ' ') : 'No description available.';
        })
        .catch(error => {
            console.error("Failed to fetch or process species data:", error);
            return 'Could not load description.';
        });
};

function convertPokeApiDetailToPokemon(pokeDetail, speciesDescription) {
    if (typeof Pokemon === 'undefined') {
        console.error("Pokemon class is not defined. Load pokemon-model.js first.");
        return null;
    }
    if (!pokeDetail || !pokeDetail.id || !pokeDetail.name) {
         console.error("Invalid pokeDetail data received for conversion:", pokeDetail);
         return null;
    }

    const pokemon = new Pokemon();
    pokemon.number = pokeDetail.id;
    pokemon.name = pokeDetail.name;

    const types = pokeDetail.types ? pokeDetail.types.map((typeSlot) => typeSlot.type.name) : [];
    const [type] = types;
    pokemon.types = types;
    pokemon.type = type || 'unknown';

    pokemon.photo = pokeDetail.sprites?.other?.['official-artwork']?.front_default
                   || pokeDetail.sprites?.other?.dream_world?.front_default
                   || pokeDetail.sprites?.front_default
                   || null;

    pokemon.abilities = pokeDetail.abilities
        ? pokeDetail.abilities.map((abilitySlot) =>
            abilitySlot.ability.name.replace('-', ' ')
          )
        : [];

    pokemon.stats = {};
    pokemon.formattedStats = pokeDetail.stats
        ? pokeDetail.stats.map((statSlot) => {
            const rawName = statSlot.stat.name;
            const value = statSlot.base_stat;
            pokemon.stats[rawName] = value;
            return {
                name: formatStatName(rawName),
                value: value,
                rawName: rawName
            };
          })
        : [];

    pokemon.height = pokeDetail.height ? pokeDetail.height / 10 : null;
    pokemon.weight = pokeDetail.weight ? pokeDetail.weight / 10 : null;

    pokemon.description = speciesDescription || 'No description available.';

    return pokemon;
}

pokeApi.getPokemonDetail = (pokemonUrlOrId) => {
    const url = typeof pokemonUrlOrId === 'string' && pokemonUrlOrId.startsWith('http')
        ? pokemonUrlOrId
        : `https://pokeapi.co/api/v2/pokemon/${pokemonUrlOrId}`;

    let pokemonDetailData;

    return fetch(url)
        .then((response) => {
            if (!response.ok) throw new Error(`Pokemon fetch failed: ${response.status} for ${url}`);
            return response.json();
        })
        .then((pokeDetail) => {
            pokemonDetailData = pokeDetail;
            if (!pokeDetail.species || !pokeDetail.species.url) {
                console.warn(`Species URL not found for ${pokeDetail.name}. Proceeding without description.`);
                return 'No description available.';
            }
            return pokeApi.getPokemonSpecies(pokeDetail.species.url);
        })
        .then((speciesDescription) => {
            return convertPokeApiDetailToPokemon(pokemonDetailData, speciesDescription);
        })
        .catch((error) => {
            console.error(`Failed overall detail fetch for ${url}:`, error);
            if (pokemonDetailData) {
                 console.warn("Returning partial Pokemon data due to species fetch failure or other error.");
                 return convertPokeApiDetailToPokemon(pokemonDetailData, 'Could not load description.');
            }
            return null;
        });
}

pokeApi.getPokemons = (offset = 0, limit = 10) => {
    const url = `https://pokeapi.co/api/v2/pokemon?offset=${offset}&limit=${limit}`;

    return fetch(url)
        .then((response) => {
            if (!response.ok) throw new Error(`Pokemon list fetch failed: ${response.status}`);
             return response.json();
         })
        .then((jsonBody) => jsonBody.results)
        .then((pokemons) => {
            const detailPromises = pokemons.map(pokemon => pokeApi.getPokemonDetail(pokemon.url));
            return Promise.all(detailPromises);
        })
        .then((pokemonsDetails) => {
             return pokemonsDetails.filter(p => p !== null);
        })
        .catch((error) => {
            console.error("Failed to fetch Pokemon list or details:", error);
            return [];
        });
}
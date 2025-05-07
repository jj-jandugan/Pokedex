document.addEventListener('DOMContentLoaded', () => {

    const pokemonList = document.getElementById('pokemonList');
    const detailViewOverlay = document.getElementById('pokemonDetailView');
    const detailContent = detailViewOverlay ? detailViewOverlay.querySelector('.detail-content') : null;
    const backButton = detailViewOverlay ? detailViewOverlay.querySelector('.back-button') : null;
    const searchBar = document.getElementById('searchBar');
    const noResultsMessage = document.getElementById('noResultsMessage');
    const paginationDiv = document.querySelector('.pagination');

    if (!pokemonList || !detailViewOverlay || !detailContent || !backButton || !searchBar || !noResultsMessage || !paginationDiv) {
        console.error("Essential DOM elements not found (List, Detail View, Search, etc.). Aborting script.");
        if (paginationDiv) paginationDiv.style.display = 'none';
        return;
    }

    const maxRecords = 200;
    const limit = 12;
    let offset = 0;
    let loadedPokemons = {};

    const MAX_STAT_VALUE = 200;

    function convertPokemonToLi(pokemon) {
        if (!pokemon || typeof pokemon.number !== 'number' || !pokemon.name) {
            console.warn("Skipping rendering of invalid/incomplete Pokemon data:", pokemon);
            return '';
        }
        const primaryType = pokemon.type || 'unknown';
        loadedPokemons[pokemon.number] = pokemon;
        return `
            <li class="pokemon ${primaryType}" data-id="${pokemon.number}" data-name="${pokemon.name.toLowerCase()}">
                <span class="number">#${String(pokemon.number).padStart(3, '0')}</span>
                <span class="name">${pokemon.name}</span>
                <div class="detail">
                    <ol class="types">
                        ${pokemon.types && pokemon.types.length > 0
                            ? pokemon.types.map((type) => `<li class="type">${type}</li>`).join('')
                            : `<li class="type ${primaryType}">${primaryType}</li>`}
                    </ol>
                    ${pokemon.photo ? `<img src="${pokemon.photo}" alt="${pokemon.name}" loading="lazy" onerror="this.style.display='none';">` : ''}
                </div>
            </li>
        `;
    }

    function loadPokemonItens(currentOffset, currentLimit) {
        const currentLoadMoreButton = document.getElementById('loadMoreButton');
        if (!currentLoadMoreButton) {
             console.log("Load More button not found, likely max records reached.");
             return;
        }

        currentLoadMoreButton.textContent = 'Loading...';
        currentLoadMoreButton.disabled = true;

        pokeApi.getPokemons(currentOffset, currentLimit).then((pokemons = []) => {
            const validPokemons = pokemons.filter(p => p);
            const newHtml = validPokemons.map(convertPokemonToLi).join('');
            pokemonList.innerHTML += newHtml;
            filterPokemonList();

            const potentiallyReachedMax = currentOffset + validPokemons.length >= maxRecords;
            const isLastBatch = validPokemons.length < currentLimit;

            const buttonToCheck = document.getElementById('loadMoreButton');
            if (buttonToCheck) {
                if (potentiallyReachedMax || isLastBatch) {
                    if (buttonToCheck.parentElement) {
                        setTimeout(() => {
                            if (buttonToCheck.parentElement) {
                               buttonToCheck.parentElement.removeChild(buttonToCheck);
                            }
                        }, 0);
                    }
                } else {
                    buttonToCheck.textContent = 'Load More';
                    buttonToCheck.disabled = false;
                }
            }

        }).catch(error => {
            console.error("Error loading Pokemon items:", error);
            const buttonToCheck = document.getElementById('loadMoreButton');
            if (buttonToCheck) {
                buttonToCheck.textContent = 'Load Error - Retry?';
                buttonToCheck.disabled = false;
            }
        });
    }

     function populateDetailView(pokemon) {
         if (!pokemon || !detailContent) return;
         let tempEl = document.createElement('div');
         tempEl.style.display = 'none';
         tempEl.className = pokemon.type || 'normal';
         document.body.appendChild(tempEl);
         let colorValue = '#ccc';
          try {
             colorValue = getComputedStyle(tempEl).backgroundColor || '#ccc';
          } catch (e) { console.warn("Could not get computed style for type color fallback."); }
         document.body.removeChild(tempEl);
         detailContent.style.setProperty('--type-color', colorValue);

         detailContent.className = 'detail-content';
         detailContent.classList.add(pokemon.type || 'normal');

         const detailName = detailContent.querySelector('.detail-pokemon-name');
         const detailNumber = detailContent.querySelector('.detail-pokemon-number');
         const detailImage = detailContent.querySelector('.detail-pokemon-image');
         const detailTypes = detailContent.querySelector('.detail-pokemon-types');
         const detailWeight = detailContent.querySelector('.detail-pokemon-weight');
         const detailHeight = detailContent.querySelector('.detail-pokemon-height');
         const detailAbilities = detailContent.querySelector('.detail-pokemon-abilities');
         const detailDescription = detailContent.querySelector('.detail-pokemon-description');
         const detailStats = detailContent.querySelector('.detail-pokemon-stats');

         detailName.textContent = pokemon.name || 'Unknown';
         detailNumber.textContent = `#${String(pokemon.number || 0).padStart(3, '0')}`;
         detailImage.src = pokemon.photo || '';
         detailImage.alt = pokemon.name || 'Pokemon image';
         detailImage.style.display = pokemon.photo ? 'block' : 'none';

         detailTypes.innerHTML = pokemon.types && pokemon.types.length > 0
             ? pokemon.types.map(type => {
                 let pillEl = document.createElement('div');
                 pillEl.style.display = 'none';
                 pillEl.className = type;
                 document.body.appendChild(pillEl);
                 let pillColorValue = '#ccc';
                 try {
                     pillColorValue = getComputedStyle(pillEl).backgroundColor || '#ccc';
                 } catch(e) { console.warn(`Could not get computed style for ${type} pill color.`) }
                 document.body.removeChild(pillEl);
                 return `<li class="type ${type}" style="background-color: ${pillColorValue};">${type}</li>`;
             }).join('')
             : `<li class="type unknown" style="background-color: #ccc;">Unknown</li>`;

         detailWeight.textContent = pokemon.weight ? pokemon.weight.toFixed(1) : '?';
         detailHeight.textContent = pokemon.height ? pokemon.height.toFixed(1) : '?';
         detailAbilities.innerHTML = pokemon.abilities && pokemon.abilities.length > 0
             ? pokemon.abilities.map(ability => `<li>${ability}</li>`).join('')
             : '<li>Unknown</li>';
         detailDescription.textContent = pokemon.description || 'No description available.';

         detailStats.innerHTML = pokemon.formattedStats && pokemon.formattedStats.length > 0
             ? pokemon.formattedStats.map(stat => {
                 const statValue = typeof stat.value === 'number' ? stat.value : 0;
                 const percentage = Math.min(100, (statValue / MAX_STAT_VALUE) * 100);
                 const safeRawName = stat.rawName ? stat.rawName.replace(/[^a-zA-Z0-9-]/g, '') : 'unknown';
                 return `
                     <li class="stat-${safeRawName}">
                         <span class="stat-name">${stat.name || 'N/A'}</span>
                         <span class="stat-value">${String(statValue).padStart(3, '\u00A0')}</span>
                         <div class="stat-bar">
                             <div class="stat-bar-inner" style="width: ${percentage}%;"></div>
                         </div>
                     </li>
                 `;
             }).join('')
             : '<li>Stats not available.</li>';

         const detailBody = detailContent.querySelector('.detail-body');
         if (detailBody) {
              detailBody.scrollTop = 0;
         }
     }

    function openDetailView(pokemonId) {
        const pokemon = loadedPokemons[pokemonId];
        if (pokemon) {
            populateDetailView(pokemon);
            detailViewOverlay.classList.remove('hidden');
            document.body.classList.add('modal-open');
        } else {
            console.warn("Details not found in cache for Pokemon ID:", pokemonId, "- Attempting direct fetch...");
            pokeApi.getPokemonDetail(pokemonId).then(fetchedPokemon => {
                if (fetchedPokemon) {
                    loadedPokemons[pokemonId] = fetchedPokemon;
                    populateDetailView(fetchedPokemon);
                    detailViewOverlay.classList.remove('hidden');
                    document.body.classList.add('modal-open');
                } else {
                    console.error("Could not fetch details for Pokemon ID:", pokemonId);
                    alert("Could not load Pokémon details.");
                }
            }).catch(err => {
                 console.error("Error fetching details on demand:", err);
                 alert("Error loading Pokémon details.");
            });
        }
    }

    function closeDetailView() {
        detailViewOverlay.classList.add('hidden');
        document.body.classList.remove('modal-open');
    }

    function filterPokemonList() {
        const searchTerm = searchBar.value.toLowerCase().trim();
        const pokemonItems = pokemonList.querySelectorAll('.pokemon');
        let visibleCount = 0;

        pokemonItems.forEach(item => {
            const name = item.dataset.name || '';
            const number = item.dataset.id || '';
            const isMatch = name.includes(searchTerm) || number.startsWith(searchTerm);

            if (isMatch) {
                item.classList.remove('hidden-by-search');
                visibleCount++;
            } else {
                item.classList.add('hidden-by-search');
            }
        });

         noResultsMessage.style.display = (visibleCount === 0 && searchTerm !== '') ? 'block' : 'none';

         if (searchTerm) {
            paginationDiv.classList.add('hidden-by-search');
         } else {
             paginationDiv.classList.remove('hidden-by-search');
         }
    }

    searchBar.addEventListener('input', filterPokemonList);

    pokemonList.addEventListener('click', (event) => {
        const listItem = event.target.closest('.pokemon:not(.hidden-by-search)');
        if (listItem && listItem.dataset.id) {
            openDetailView(listItem.dataset.id);
        }
    });

    paginationDiv.addEventListener('click', (event) => {
        if (event.target && event.target.id === 'loadMoreButton') {
            const currentLoadMoreButton = event.target;
            offset += limit;
            const remainingRecords = maxRecords - offset;
            const newLimit = Math.min(limit, remainingRecords > 0 ? remainingRecords : 0);

            if (newLimit > 0) {
                loadPokemonItens(offset, newLimit);
            } else {
                 console.log("Load More clicked, but calculated limit is 0 or less. Max likely reached.");
                 currentLoadMoreButton.disabled = true;
            }
        }
    });

    backButton.addEventListener('click', closeDetailView);

    detailViewOverlay.addEventListener('click', (event) => {
        if (event.target === detailViewOverlay) {
            // closeDetailView();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !detailViewOverlay.classList.contains('hidden')) {
            closeDetailView();
        }
    });

    loadPokemonItens(offset, limit);

});
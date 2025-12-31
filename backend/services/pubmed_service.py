import requests
import xml.etree.ElementTree as ET
import logging

logger = logging.getLogger(__name__)

BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

def search_pubmed(query, max_results=10):
    """
    Search PubMed for a given query and return a list of article details.
    """
    try:
        # Step 1: ESearch to get list of IDs
        search_url = f"{BASE_URL}/esearch.fcgi"
        search_params = {
            "db": "pubmed",
            "term": query,
            "retmode": "json",
            "retmax": max_results
        }
        response = requests.get(search_url, params=search_params)
        response.raise_for_status()
        data = response.json()
        
        id_list = data.get("esearchresult", {}).get("idlist", [])
        
        if not id_list:
            return []

        # Step 2: EFetch to get full article details with abstracts
        fetch_url = f"{BASE_URL}/efetch.fcgi"
        fetch_params = {
            "db": "pubmed",
            "id": ",".join(id_list),
            "retmode": "xml"
        }
        fetch_response = requests.get(fetch_url, params=fetch_params)
        fetch_response.raise_for_status()
        
        return parse_pubmed_xml(fetch_response.text)

    except Exception as e:
        logger.error(f"Error searching PubMed: {e}")
        return []

def parse_pubmed_xml(xml_content):
    """
    Parse the XML response from EFetch to extract article details.
    """
    articles = []
    try:
        root = ET.fromstring(xml_content)
        for article in root.findall(".//PubmedArticle"):
            try:
                title = article.find(".//ArticleTitle").text
                
                # Abstract
                abstract_texts = article.findall(".//AbstractText")
                abstract = " ".join([elem.text for elem in abstract_texts if elem.text]) if abstract_texts else "No abstract available."
                
                # Authors
                author_list = article.findall(".//Author")
                authors = []
                for author in author_list:
                    last_name = author.find("LastName")
                    initials = author.find("Initials")
                    if last_name is not None and initials is not None:
                        authors.append(f"{last_name.text} {initials.text}")
                    elif last_name is not None:
                        authors.append(last_name.text)
                
                # Journal
                journal = article.find(".//Title")
                journal_title = journal.text if journal is not None else "Unknown Journal"
                
                # PubDate
                pub_date = article.find(".//PubDate")
                year = pub_date.find("Year")
                year_text = year.text if year is not None else "N/A"

                # DOI / Link
                article_ids = article.find(".//ArticleIdList")
                doi = None
                pmid = article.find(".//PMID").text
                
                if article_ids is not None:
                    for aid in article_ids:
                        if aid.get("IdType") == "doi":
                            doi = aid.text
                            break
                
                link = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"

                articles.append({
                    "id": pmid,
                    "title": title,
                    "abstract": abstract,
                    "authors": authors[:5],  # Limit to first 5
                    "journal": journal_title,
                    "year": year_text,
                    "link": link,
                    "doi": doi
                })
            except Exception as e:
                logger.warning(f"Failed to parse an article: {e}")
                continue
                
    except Exception as e:
        logger.error(f"Error parsing XML: {e}")
        
    return articles

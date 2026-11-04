#!/usr/bin/perl
# scripts/stock_list.txt + <site>.json -> stock-match.json
# A position is found only when collection AND colour code match. If only the collection exists,
# found=false and "note" says so. Same-name collections of another brand go to "otherBrandMatches" for a human to check.
use strict; use warnings; use utf8;
use FindBin; use lib $FindBin::Bin; use Common;
use JSON::PP;

my $R=root();
my %file=(Betap=>['betap.json'], BIG=>['carus.json','beaulieu.json'], AW=>['associated-weavers.json'], ITC=>['itc.json']);
my %data; for my $fs (values %file) { for my $f (@$fs) { $data{$f}//= -s "$R/$f" ? read_json("$R/$f") : [] } }
sub norm { my $s=lc($_[0]//''); $s=~s/[^a-z0-9]+//g; return $s }
sub ncode { my $s=$_[0]//''; $s=~s/^0+(?=\d)//; return $s }

sub code_match {
    my ($want,$have)=@_;
    return 1 if ncode($want) eq ncode($have);
    return 0;
}
sub entry {
    my ($brand,$q,$c,$col,$site,$note)=@_;
    my %e=(brand=>$brand,query=>$q,found=>JSON::PP::true,collection=>$c->{collection},colourCode=>$col->{code},colourName=>$col->{name},
        image=>$col->{image},url=>$col->{url},collectionUrl=>$c->{url},siteJson=>$site);
    $e{roomImage}=$col->{roomImage} if $col->{roomImage};
    $e{note}=$note if $note;
    return \%e;
}
my @out;
open my $L,'<:encoding(UTF-8)',"$R/scripts/stock_list.txt" or die;
while (my $line=<$L>) {
    chomp $line; $line=~s/\r//; next if $line=~/^#/ || $line!~/\S/;
    my ($brand,$coll,$rest)=split /\|/,$line,3; $rest//='';
    my @want=split ' ',$rest; @want=('') unless @want;
    for my $w (@want) {
        my ($word,$code)= $w=~/^([^:]*):(.+)$/ ? ($1,$2) : ($w=~/^\d|\//?('',$w):($w,''));
        my $q=join(' ',grep {length} $coll,$word,$code);
        my ($hit,@colls);
        for my $f (@{$file{$brand}}) {
            for my $c (@{$data{$f}}) {
                next unless norm($c->{collection}) eq norm($coll) || ($brand eq 'BIG' && norm($c->{collection}) eq norm($coll));
                push @colls,[$c,$f];
            }
        }
        my $note;
        # Carus Golden Gate: stock "01/27477" is design 001, colour 27477; codes read GG001-27477.
        if ($brand eq 'BIG' && norm($coll) eq 'goldengate') {
            my ($c,$f)=@{$colls[0]||[]};
            if ($c) {
                my ($num)= $code=~m{/(\d+)$}; $num//=$code;
                for my $col (@{$c->{colours}}) {
                    if ($col->{code}=~/-$num$/ || $col->{code}=~/$num/) { $hit=entry($brand,$q,$c,$col,$f); last }
                }
            }
        } else {
            for my $cf (@colls) {
                my ($c,$f)=@$cf;
                for my $col (@{$c->{colours}}) {
                    if (length $code ? code_match($code,$col->{code}) : (length $word && norm($col->{name}) eq norm($word))) { $hit=entry($brand,$q,$c,$col,$f); last }
                }
                last if $hit;
            }
        }
        if ($hit) { push @out,$hit; next }
        my %e=(brand=>$brand,query=>$q,found=>JSON::PP::false,collection=>undef,colourCode=>(length $code?$code:undef),colourName=>(length $word?$word:undef),
            image=>undef,url=>undef,siteJson=>undef);
        if (@colls) {
            my ($c,$f)=@{$colls[0]};
            @e{qw(collection siteJson collectionUrl)}=($c->{collection},$f,$c->{url});
            $e{note}='collection is on the site, this colour is not. Site colours: '.join(', ',map {$_->{code}} @{$c->{colours}});
        } else { $e{note}='collection not found on the sites checked' }
        # Same-named collection under another brand, with this code.
        my @other;
        for my $f (sort keys %data) {
            next if grep { $_ eq $f } @{$file{$brand}};
            for my $c (@{$data{$f}}) {
                next unless norm($c->{collection}) eq norm($coll);
                my @m=length $code ? (grep { code_match($code,$_->{code}) } @{$c->{colours}}) : ();
                push @other,{brand=>$c->{brand},collection=>$c->{collection},url=>$c->{url},siteJson=>$f,
                    colourMatch=>(@m?JSON::PP::true:JSON::PP::false),(@m?(colourCode=>$m[0]{code},image=>$m[0]{image},colourUrl=>$m[0]{url}):())};
            }
        }
        $e{otherBrandMatches}=\@other if @other;
        push @out,\%e;
    }
}
write_json("$R/stock-match.json",\@out);
my %t; for (@out) { $t{$_->{brand}}{$_->{found}?'found':'miss'}++ }
printf "%-6s found %3d  missing %3d\n",$_,$t{$_}{found}//0,$t{$_}{miss}//0 for sort keys %t;
for (grep { !$_->{found} } @out) { printf "  miss %-5s %-26s %s%s\n",$_->{brand},$_->{query},($_->{note}=~/not found/?'':'[collection exists] '),($_->{otherBrandMatches}?'other: '.join(',',map {$_->{brand}.($_->{colourMatch}?'+code':'')} @{$_->{otherBrandMatches}}):'') }
